package sg.edu.nus.serms.shared.config;

import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

/**
 * The session cookie written by Spring Session JDBC (report AD-08). It keeps the contract shape of
 * docs/contracts/auth-and-approval.md section 2: name {@code JSESSIONID}, HttpOnly, Secure and
 * SameSite=Lax, read from the same {@code server.servlet.session.cookie.*} properties the servlet
 * container used before. Declared explicitly so every web environment (embedded server and MockMvc)
 * writes the same cookie.
 */
@Configuration(proxyBeanMethods = false)
public class SessionCookieConfig {

  @Bean
  CookieSerializer cookieSerializer(
      @Value("${server.servlet.session.cookie.name:JSESSIONID}") String name,
      @Value("${server.servlet.session.cookie.http-only:true}") boolean httpOnly,
      @Value("${server.servlet.session.cookie.secure:true}") boolean secure,
      @Value("${server.servlet.session.cookie.same-site:lax}") String sameSite) {
    var serializer = new DefaultCookieSerializer();
    serializer.setCookieName(name);
    serializer.setCookiePath("/");
    serializer.setUseHttpOnlyCookie(httpOnly);
    serializer.setUseSecureCookie(secure);
    String site = sameSite.strip().toLowerCase(Locale.ROOT);
    serializer.setSameSite(site.isEmpty() ? null : Character.toUpperCase(site.charAt(0)) + site.substring(1));
    return serializer;
  }
}
