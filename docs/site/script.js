(function () {
  'use strict';

  document.documentElement.classList.add('js');

  function wireTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
    if (tabs.length === 0) return;

    function select(tab, moveFocus) {
      tabs.forEach(function (candidate) {
        var chosen = candidate === tab;
        var pane = document.getElementById(candidate.getAttribute('aria-controls'));
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
        var last = tabs.length - 1;
        var target = {
          ArrowRight: index === last ? 0 : index + 1,
          ArrowLeft: index === 0 ? last : index - 1,
          Home: 0,
          End: last
        }[event.key];
        if (target === undefined) return;
        event.preventDefault();
        select(tabs[target], true);
      });
    });
  }

  function addCopyButtons() {
    if (!navigator.clipboard) return;
    document.querySelectorAll('#setup pre').forEach(function (pre) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy';
      button.textContent = 'Copy';
      button.setAttribute('aria-label', 'Copy command');
      button.addEventListener('click', function () {
        navigator.clipboard.writeText(pre.querySelector('code').textContent).then(function () {
          button.textContent = 'Copied';
          setTimeout(function () { button.textContent = 'Copy'; }, 1500);
        }, function () {});
      });
      var frame = document.createElement('div');
      frame.className = 'code-frame';
      pre.parentNode.insertBefore(frame, pre);
      frame.appendChild(pre);
      frame.appendChild(button);
    });
  }

  function init() {
    wireTabs();
    addCopyButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
