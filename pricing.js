/* Thumbly — Stripe checkout + local currency display */
(function () {
  var PRICE_USD = 6;

  var fxMap = {
    AU: { sym: 'A$', rate: 1.55 }, NZ: { sym: 'NZ$', rate: 1.68 },
    GB: { sym: '£',  rate: 0.79 }, CA: { sym: 'C$',  rate: 1.36 },
    DE: { sym: '€',  rate: 0.92 }, FR: { sym: '€',   rate: 0.92 },
    NL: { sym: '€',  rate: 0.92 }, ES: { sym: '€',   rate: 0.92 },
    IT: { sym: '€',  rate: 0.92 }, IN: { sym: '₹',   rate: 83   },
    JP: { sym: '¥',  rate: 149  }, SG: { sym: 'S$',  rate: 1.34 },
    BR: { sym: 'R$', rate: 4.97 }, MX: { sym: '$',   rate: 17.1 },
  };

  var cc = (navigator.language || 'en-US').split('-')[1] || 'US';
  var fx  = fxMap[cc] || { sym: '$', rate: 1 };
  var localPrice = Math.round(PRICE_USD * fx.rate);

  window.THUMBLY_PRICE_DISPLAY = fx.sym + localPrice + '/mo';

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-price]').forEach(function (el) {
      el.textContent = window.THUMBLY_PRICE_DISPLAY;
    });
  });

  window.THUMBLY_CHECKOUT = function () {
    var url = window.THUMBLY_PRO_URL;
    if (!url) {
      alert('Checkout coming soon — please check back shortly!');
      return;
    }
    location.href = url;
  };
})();
