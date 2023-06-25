/**
 * @file
 * JavaScript behaviors for Telephone element.
 */

(function ($, Drupal, drupalSettings, once) {

  'use strict';

  // @see https://github.com/jackocnr/intl-tel-input#options
  Drupal.webform = Drupal.webform || {};
  Drupal.webform.intlTelInput = Drupal.webform.intlTelInput || {};
  Drupal.webform.intlTelInput.options = Drupal.webform.intlTelInput.options || {};

  /**
   * Initialize Telephone international element.
   * @see http://intl-tel-input.com/node_modules/intl-tel-input/examples/gen/is-valid-number.html
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.webformTelephoneInternational = {
    attach: function (context) {
      if (!$.fn.intlTelInput) {
        return;
      }

      $(once('webform-telephone-international', 'input.js-webform-telephone-international', context)).each(function () {
        var $telephone = $(this);

        // Add error message container.
        var $error = $('<strong class="error form-item--error-message">' + Drupal.t('Invalid phone number') + '</strong>').hide();
        $telephone.closest('.js-form-item').append($error);

        var options = {
          // The utilsScript is fetched when the page has finished.
          // @see \Drupal\webform\Plugin\WebformElement\Telephone::prepare
          // @see https://github.com/jackocnr/intl-tel-input
          utilsScript: drupalSettings.webform.intlTelInput.utilsScript,
          nationalMode: false
        };

        // Parse data attributes.
        if ($telephone.attr('data-webform-telephone-international-initial-country')) {
          options.initialCountry = $telephone.attr('data-webform-telephone-international-initial-country');
        }
        if ($telephone.attr('data-webform-telephone-international-preferred-countries')) {
          options.preferredCountries = JSON.parse($telephone.attr('data-webform-telephone-international-preferred-countries'));
        }

        options = $.extend(options, Drupal.webform.intlTelInput.options);
        $telephone.intlTelInput(options);

        var reset = function () {
          $telephone.removeClass('error');
          $error.hide();
        };

        var validate = function () {
          if ($.trim($telephone.val())) {
            if (!$telephone.intlTelInput('isValidNumber')) {
              $telephone.addClass('error');
              var placeholder = $telephone.attr('placeholder');
              var message;
              if (placeholder) {
                message = Drupal.t('The phone number is not valid. (e.g. @example)', {'@example': placeholder});
              }
              else {
                message = Drupal.t('The phone number is not valid.');
              }
              $error.html(message).show();
              return false;
            }
          }
          return true;
        };

        $telephone.on('blur', function () {
          reset();
          validate();
        });

        $telephone.on('keyup change', reset);

        // Check for a valid phone number on submit.
        var $form = $(this.form);
        $form.on('submit', function (event) {
          if (!validate()) {
            $telephone.focus();
            event.preventDefault();

            // On validation error make sure to clear submit the once behavior.
            // @see Drupal.behaviors.webformSubmitOnce
            // @see webform.form.submit_once.js
            if (Drupal.behaviors.webformSubmitOnce) {
              Drupal.behaviors.webformSubmitOnce.clear();
            }
          }
        });
      });
    }
  };

})(jQuery, Drupal, drupalSettings, once);
;
/**
 * @file
 * Wide viewport search bar interactions.
 */

((Drupal) => {
  const searchWideButtonSelector =
    '[data-drupal-selector="block-search-wide-button"]';
  const searchWideButton = document.querySelector(searchWideButtonSelector);
  const searchWideWrapperSelector =
    '[data-drupal-selector="block-search-wide-wrapper"]';
  const searchWideWrapper = document.querySelector(searchWideWrapperSelector);

  /**
   * Determine if search is visible.
   *
   * @return {boolean}
   *   True if the search wrapper contains "is-active" class, false if not.
   */
  function searchIsVisible() {
    return searchWideWrapper.classList.contains('is-active');
  }
  Drupal.olivero.searchIsVisible = searchIsVisible;

  /**
   * Closes search bar when a click event does not happen at an (x,y) coordinate
   * that does not overlap with either the search wrapper or button.
   *
   * @see https://bugs.webkit.org/show_bug.cgi?id=229895
   *
   * @param {Event} e click event
   */
  function watchForClickOut(e) {
    const clickInSearchArea = e.target.matches(`
      ${searchWideWrapperSelector},
      ${searchWideWrapperSelector} *,
      ${searchWideButtonSelector},
      ${searchWideButtonSelector} *
    `);
    if (!clickInSearchArea && searchIsVisible()) {
      // eslint-disable-next-line no-use-before-define
      toggleSearchVisibility(false);
    }
  }

  /**
   * Closes search bar when focus moves to another target.
   * Avoids closing search bar if event does not have related target - required for Safari.
   *
   * @see https://bugs.webkit.org/show_bug.cgi?id=229895
   *
   * @param {Event} e focusout event
   */
  function watchForFocusOut(e) {
    if (e.relatedTarget) {
      const inSearchBar = e.relatedTarget.matches(
        `${searchWideWrapperSelector}, ${searchWideWrapperSelector} *`,
      );
      const inSearchButton = e.relatedTarget.matches(
        `${searchWideButtonSelector}, ${searchWideButtonSelector} *`,
      );

      if (!inSearchBar && !inSearchButton) {
        // eslint-disable-next-line no-use-before-define
        toggleSearchVisibility(false);
      }
    }
  }

  /**
   * Closes search bar on escape keyup, if open.
   *
   * @param {Event} e keyup event
   */
  function watchForEscapeOut(e) {
    if (e.key === 'Escape') {
      // eslint-disable-next-line no-use-before-define
      toggleSearchVisibility(false);
    }
  }

  /**
   * Set focus for the search input element.
   */
  function handleFocus() {
    if (searchIsVisible()) {
      searchWideWrapper.querySelector('input[type="search"]').focus();
    } else if (searchWideWrapper.contains(document.activeElement)) {
      // Return focus to button only if focus was inside of the search wrapper.
      searchWideButton.focus();
    }
  }

  /**
   * Toggle search functionality visibility.
   *
   * @param {boolean} visibility
   *   True if we want to show the form, false if we want to hide it.
   */
  function toggleSearchVisibility(visibility) {
    searchWideButton.setAttribute('aria-expanded', visibility === true);
    searchWideWrapper.addEventListener('transitionend', handleFocus, {
      once: true,
    });

    if (visibility === true) {
      Drupal.olivero.closeAllSubNav();
      searchWideWrapper.classList.add('is-active');

      document.addEventListener('click', watchForClickOut, { capture: true });
      document.addEventListener('focusout', watchForFocusOut, {
        capture: true,
      });
      document.addEventListener('keyup', watchForEscapeOut, { capture: true });
    } else {
      searchWideWrapper.classList.remove('is-active');

      document.removeEventListener('click', watchForClickOut, {
        capture: true,
      });
      document.removeEventListener('focusout', watchForFocusOut, {
        capture: true,
      });
      document.removeEventListener('keyup', watchForEscapeOut, {
        capture: true,
      });
    }
  }

  Drupal.olivero.toggleSearchVisibility = toggleSearchVisibility;

  /**
   * Initializes the search wide button.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *  Adds aria-expanded attribute to the search wide button.
   */
  Drupal.behaviors.searchWide = {
    attach(context) {
      const searchWideButtonEl = once(
        'search-wide',
        searchWideButtonSelector,
        context,
      ).shift();
      if (searchWideButtonEl) {
        searchWideButtonEl.setAttribute('aria-expanded', searchIsVisible());
        searchWideButtonEl.addEventListener('click', () => {
          toggleSearchVisibility(!searchIsVisible());
        });
      }
    },
  };
})(Drupal);
;
