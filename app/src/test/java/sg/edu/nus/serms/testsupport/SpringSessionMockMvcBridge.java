package sg.edu.nus.serms.testsupport;

import jakarta.servlet.Filter;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.stream.Stream;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.web.context.support.WebApplicationContextUtils;
import org.springframework.web.util.WebUtils;

/**
 * Test-classpath only. With Spring Session JDBC the server identifies a session by its {@code
 * JSESSIONID} cookie it issues, not by the servlet container's session, so a {@link MockHttpSession}
 * passed with
 * {@code .session(...)} would be ignored. This bridge keeps the existing tests' meaning while the
 * real JDBC session repository runs underneath:
 *
 * <ul>
 *   <li>after a response sets {@code JSESSIONID}, the request gets a {@link MockHttpSession} whose id is
 *       the Spring Session id (a rotated id after login gives a new {@code MockHttpSession});
 *   <li>a later request made with that {@code MockHttpSession} sends the matching cookie;
 *   <li>an expired {@code JSESSIONID} cookie (logout, revoked session) invalidates the {@link
 *       MockHttpSession}.
 * </ul>
 */
@AutoConfiguration
@ConditionalOnClass(name = "org.springframework.session.web.http.SessionRepositoryFilter")
public class SpringSessionMockMvcBridge {
  static final String COOKIE = "JSESSIONID";
  static final String KEY = SpringSessionMockMvcBridge.class.getName() + ".cookie";

  @Bean
  @Order(Ordered.HIGHEST_PRECEDENCE)
  MockMvcBuilderCustomizer springSessionCookieBridge() {
    // The filter runs first in the chain, after every request post-processor (such as a test's
    // csrf() helper that replaces the cookies), and before Spring Session's repository filter.
    return builder -> {
      builder.addFilters(
          (Filter)
              (request, response, chain) -> {
                var mock = WebUtils.getNativeRequest(request, MockHttpServletRequest.class);
                if (mock != null) attach(mock);
                chain.doFilter(request, response);
              });
      builder.alwaysDo(SpringSessionMockMvcBridge::capture);
    };
  }

  static MockHttpServletRequest attach(MockHttpServletRequest request) {
    if (!(request.getSession(false) instanceof MockHttpSession session)) return request;
    if (!(session.getAttribute(KEY) instanceof String value)) return request;
    Cookie[] existing = request.getCookies() == null ? new Cookie[0] : request.getCookies();
    if (Arrays.stream(existing).anyMatch(c -> COOKIE.equals(c.getName()))) return request;
    request.setCookies(Stream.concat(Arrays.stream(existing), Stream.of(new Cookie(COOKIE, value)))
        .toArray(Cookie[]::new));
    return request;
  }

  static void capture(MvcResult result) {
    Cookie cookie = result.getResponse().getCookie(COOKIE);
    if (cookie == null) return;
    var request = (MockHttpServletRequest) result.getRequest();
    var current = request.getSession(false) instanceof MockHttpSession s ? s : null;
    if (cookie.getMaxAge() == 0 || cookie.getValue() == null || cookie.getValue().isEmpty()) {
      if (current != null && !current.isInvalid()) current.invalidate();
      return;
    }
    String id = decode(cookie.getValue());
    MockHttpSession session = current;
    if (session == null || !id.equals(session.getId())) {
      session = new MockHttpSession(request.getServletContext(), id);
      request.setSession(session);
    }
    session.setAttribute(KEY, cookie.getValue());
    copyStoredAttributes(request, id, session);
  }

  /** Snapshot of what the JDBC repository actually persisted, for assertions on session content. */
  @SuppressWarnings({"rawtypes", "unchecked"})
  static void copyStoredAttributes(MockHttpServletRequest request, String id, MockHttpSession target) {
    var context = WebApplicationContextUtils.getWebApplicationContext(request.getServletContext());
    if (context == null) return;
    var repository = context.getBeanProvider(SessionRepository.class).getIfAvailable();
    if (repository == null) return;
    Session stored = (Session) repository.findById(id);
    if (stored == null) return;
    for (String name : stored.getAttributeNames()) target.setAttribute(name, stored.getAttribute(name));
  }

  static String decode(String value) {
    try {
      return new String(Base64.getDecoder().decode(value), StandardCharsets.UTF_8);
    } catch (IllegalArgumentException notBase64) {
      return value;
    }
  }
}
