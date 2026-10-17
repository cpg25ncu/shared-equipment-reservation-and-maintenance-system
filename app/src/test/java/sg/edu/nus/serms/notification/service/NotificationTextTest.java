package sg.edu.nus.serms.notification.service;

import static org.assertj.core.api.Assertions.*;

import java.time.Instant;
import java.util.Locale;
import org.junit.jupiter.api.Test;

class NotificationTextTest {
  private static final Instant DUE = Instant.parse("2026-10-16T18:59:00Z");

  @Test
  void writesEnglishSingaporeTimeWhateverTheDefaultLocale() {
    Locale previous = Locale.getDefault();
    try {
      for (Locale locale : new Locale[] {Locale.SIMPLIFIED_CHINESE, Locale.GERMANY, Locale.US}) {
        Locale.setDefault(locale);
        // A new instance per locale: the formatter must not take its language from the default.
        assertThat(new NotificationText(null).time(DUE))
            .as("default locale %s", locale)
            .isEqualTo("17 Oct 2026, 02:59 SGT");
      }
    } finally {
      Locale.setDefault(previous);
    }
  }
}
