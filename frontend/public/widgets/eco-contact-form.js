/**
 * eco-contact-form — dependency-free contact form widget.
 *
 * Usage:
 *   <script src="/widgets/eco-contact-form.js" defer></script>
 *   <eco-contact-form endpoint="https://eco.stuff8.com/api/contact/submit"></eco-contact-form>
 *
 * Optional attributes:
 *   endpoint  — URL to POST submissions to (required)
 *   source    — campaign/source tag attached to each submission
 *   title     — heading shown above the form (default "Get in touch")
 */
class EcoContactForm extends HTMLElement {
  connectedCallback() {
    const endpoint = this.getAttribute('endpoint') || '';
    if (!endpoint) {
      this.innerHTML = '<p class="eco-contact-form__error">Missing endpoint attribute.</p>';
      return;
    }
    this._endpoint = endpoint;
    this._source = this.getAttribute('source') || '';
    this._title = this.getAttribute('title') || 'Get in touch';
    this._submitting = false;
    this.render();
    this.bind();
  }

  render() {
    this.innerHTML = `
      <form class="eco-contact-form" novalidate>
        <h3 class="eco-contact-form__title">${this._escape(this._title)}</h3>
        <label class="eco-contact-form__field">
          <span>Name</span>
          <input name="name" type="text" required autocomplete="name" placeholder="Your name" />
        </label>
        <label class="eco-contact-form__field">
          <span>Email</span>
          <input name="email" type="email" required autocomplete="email" placeholder="you@example.com" />
        </label>
        <label class="eco-contact-form__field">
          <span>Subject</span>
          <input name="subject" type="text" placeholder="What is this about?" />
        </label>
        <label class="eco-contact-form__field">
          <span>Message</span>
          <textarea name="message" rows="5" required placeholder="Tell us what you need…"></textarea>
        </label>
        <!-- Honeypot: hidden from humans, filled by bots. -->
        <input name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" class="eco-contact-form__honeypot" />
        <label class="eco-contact-form__consent">
          <input name="consent" type="checkbox" required />
          <span>I agree to be contacted about my message.</span>
        </label>
        <button type="submit" class="eco-contact-form__submit">Send</button>
        <p class="eco-contact-form__status" role="status" aria-live="polite"></p>
      </form>
    `;
  }

  bind() {
    const form = this.querySelector('form');
    const status = this.querySelector('.eco-contact-form__status');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (this._submitting) return;
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data.consent) {
        this.setStatus(status, 'Please confirm you agree to be contacted.', 'error');
        return;
      }
      this._submitting = true;
      const button = this.querySelector('.eco-contact-form__submit');
      button.disabled = true;
      button.textContent = 'Sending…';
      this.setStatus(status, '', '');
      try {
        const response = await fetch(this._endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, source: this._source })
        });
        if (!response.ok) {
          let message = 'Something went wrong. Please try again later.';
          try {
            const body = await response.json();
            if (body.error) message = body.error;
          } catch {}
          throw new Error(message);
        }
        form.reset();
        this.setStatus(status, 'Thanks! We received your message and will get back to you.', 'success');
      } catch (error) {
        this.setStatus(status, error.message, 'error');
      } finally {
        this._submitting = false;
        button.disabled = false;
        button.textContent = 'Send';
      }
    });
  }

  setStatus(node, message, type) {
    node.textContent = message;
    node.className = 'eco-contact-form__status' + (type ? ' eco-contact-form__status--' + type : '');
  }

  _escape(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }
}

if (!customElements.get('eco-contact-form')) {
  customElements.define('eco-contact-form', EcoContactForm);
}
