(function () {
  'use strict';

  document.documentElement.classList.add('js');

  function wireTabs() {
    var tablist = document.querySelector('.tablist');
    if (!tablist) return;

    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('.tab'));
    if (tabs.length === 0) return;

    function select(tab, moveFocus) {
      tabs.forEach(function (candidate) {
        var chosen = candidate === tab;
        var pane = document.getElementById(candidate.getAttribute('data-pane'));

        candidate.setAttribute('aria-selected', chosen ? 'true' : 'false');
        candidate.tabIndex = chosen ? 0 : -1;
        if (pane) pane.classList.toggle('is-active', chosen);
      });

      if (moveFocus) tab.focus();
    }

    tabs.forEach(function (tab, index) {
      tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;

      tab.addEventListener('click', function () {
        select(tab, false);
      });

      tab.addEventListener('keydown', function (event) {
        var offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (offset === 0) return;

        event.preventDefault();
        select(tabs[(index + offset + tabs.length) % tabs.length], true);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireTabs);
  } else {
    wireTabs();
  }
}());
