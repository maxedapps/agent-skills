(function () {
  'use strict';

  function showLocalError(diagram) {
    var output = diagram.querySelector('.mermaid-output');
    diagram.setAttribute('data-state', 'error');
    output.replaceChildren();
    var message = document.createElement('p');
    message.className = 'mermaid-error';
    message.textContent = 'This diagram could not be rendered. Its source is shown below.';
    output.appendChild(message);
  }

  function fitSvgToContent(svg) {
    try {
      var graphics = svg.querySelector(':scope > g');
      if (!graphics || typeof graphics.getBBox !== 'function') return;
      var box = graphics.getBBox();
      if (![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.width <= 0 || box.height <= 0) return;
      var padding = 16;
      svg.setAttribute('viewBox', [
        box.x - padding,
        box.y - padding,
        box.width + padding * 2,
        box.height + padding * 2
      ].join(' '));
    } catch (_error) {
      // Preserve Mermaid's original viewBox when browser geometry is unavailable.
    }
  }

  async function renderDiagram(diagram, index, api, initializationError) {
    var sourceNode = diagram.querySelector('.mermaid-source code');
    var output = diagram.querySelector('.mermaid-output');

    try {
      if (initializationError) throw initializationError;
      if (!api || typeof api.render !== 'function') throw new Error('Mermaid is unavailable');
      var result = await api.render('explainer-mermaid-' + String(index + 1), sourceNode.textContent);
      output.innerHTML = result.svg;
      fitSvgToContent(output.querySelector('svg'));
      if (typeof result.bindFunctions === 'function') result.bindFunctions(output);
      diagram.setAttribute('data-state', 'rendered');
    } catch (_error) {
      showLocalError(diagram);
    }
  }

  async function renderAll() {
    var diagrams = Array.prototype.slice.call(document.querySelectorAll('[data-mermaid-diagram]'));
    var api = globalThis.mermaid;
    var initializationError = null;

    try {
      if (!api || typeof api.initialize !== 'function') throw new Error('Mermaid is unavailable');
      api.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        deterministicIds: true,
        deterministicIDSeed: 'explainer'
      });
    } catch (error) {
      initializationError = error;
    }

    for (var index = 0; index < diagrams.length; index += 1) {
      await renderDiagram(diagrams[index], index, api, initializationError);
    }
  }

  globalThis.ExplainerMermaidRuntime = {
    fitSvgToContent: fitSvgToContent,
    renderAll: renderAll,
    renderDiagram: renderDiagram,
    showLocalError: showLocalError
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll, { once: true });
  } else {
    renderAll();
  }
})();
