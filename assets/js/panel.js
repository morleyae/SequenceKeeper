(function () {
  "use strict";

  var sequenceList = document.getElementById("sequence-list");
  var sourceLabel = document.getElementById("source-label");
  var status = document.getElementById("status");
  var removeGapsButton = document.getElementById("remove-gaps");
  var isRefreshing = false;
  var lastSequenceState = null;
  var sequenceOrder = [];
  var draggedRow = null;
  var dragPointerId = null;
  var dragStartY = 0;
  var dragMoved = false;

  try {
    var savedOrder = JSON.parse(window.localStorage.getItem("sequenceKeeper.sequenceOrder") || "[]");
    if (Array.isArray(savedOrder)) sequenceOrder = savedOrder.map(String);
  } catch (storageError) {}

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state || "";
  }

  function hostApi() {
    var cep = window.__adobe_cep__;
    if (!cep || typeof cep.evalScript !== "function") {
      setStatus("Open this panel in Premiere Pro.", "error");
      return null;
    }
    return cep;
  }

  function decode(value) {
    try { return decodeURIComponent(value); }
    catch (error) { return value; }
  }

  function storeSequenceOrder() {
    try { window.localStorage.setItem("sequenceKeeper.sequenceOrder", JSON.stringify(sequenceOrder)); }
    catch (storageError) {}
  }

  function applySequenceOrder(sequences) {
    var byId = {};
    var ordered = [];
    sequences.forEach(function (sequence) { byId["$" + sequence.id] = sequence; });
    sequenceOrder.forEach(function (id) {
      var key = "$" + id;
      if (byId[key]) {
        ordered.push(byId[key]);
        delete byId[key];
      }
    });
    sequences.forEach(function (sequence) {
      var key = "$" + sequence.id;
      if (byId[key]) {
        ordered.push(byId[key]);
        delete byId[key];
      }
    });
    sequenceOrder = ordered.map(function (sequence) { return sequence.id; });
    storeSequenceOrder();
    return ordered;
  }

  function saveRenderedSequenceOrder() {
    sequenceOrder = [];
    for (var index = 0; index < sequenceList.children.length; index++) {
      sequenceOrder.push(sequenceList.children[index].getAttribute("data-sequence-id"));
    }
    storeSequenceOrder();
  }

  function clearDropIndicators() {
    for (var index = 0; index < sequenceList.children.length; index++) {
      sequenceList.children[index].classList.remove("drop-before", "drop-after");
    }
  }

  function moveDraggedSequence(event) {
    if (!draggedRow || event.pointerId !== dragPointerId) return;
    if (!dragMoved) {
      if (Math.abs(event.clientY - dragStartY) < 3) return;
      dragMoved = true;
      draggedRow.classList.add("is-dragging");
    }
    event.preventDefault();

    var targetRow = document.elementFromPoint(event.clientX, event.clientY);
    while (targetRow && targetRow.parentNode !== sequenceList) targetRow = targetRow.parentNode;
    if (!targetRow || targetRow === draggedRow) return;

    var after = event.clientY >= targetRow.getBoundingClientRect().top + targetRow.offsetHeight / 2;
    clearDropIndicators();
    targetRow.classList.add(after ? "drop-after" : "drop-before");
    if ((!after && draggedRow.nextSibling === targetRow) || (after && targetRow.nextSibling === draggedRow)) return;
    sequenceList.insertBefore(draggedRow, after ? targetRow.nextSibling : targetRow);
  }

  function finishDraggedSequence(event) {
    if (!draggedRow || event.pointerId !== dragPointerId) return;
    if (dragMoved) saveRenderedSequenceOrder();
    draggedRow.classList.remove("is-dragging");
    draggedRow = null;
    dragPointerId = null;
    dragMoved = false;
    clearDropIndicators();
  }

  sequenceList.addEventListener("pointermove", moveDraggedSequence);
  sequenceList.addEventListener("pointerup", finishDraggedSequence);
  sequenceList.addEventListener("pointercancel", finishDraggedSequence);

  function showCopyResult(result, button, fallbackMessage) {
    button.disabled = false;
    if (result && result.indexOf("OK|") === 0) {
      var successMessage = decode(result.substring(3));
      setStatus(successMessage, "success");
      refreshSequences();
    } else if (result && result.indexOf("WARN|") === 0) {
      var warningMessage = decode(result.substring(5));
      setStatus(warningMessage, "warning");
      refreshSequences();
    } else {
      setStatus(decode((result || fallbackMessage || "The operation failed.").replace(/^ERROR\|/, "")), "error");
    }
  }

  function renderSequences(result) {
    if (!result || result.indexOf("OK\n") !== 0) {
      lastSequenceState = null;
      sequenceList.textContent = "";
      sourceLabel.hidden = true;
      setStatus(decode((result || "No response from Premiere Pro.").replace(/^ERROR\|/, "")), "error");
      return;
    }

    var rows = result.substring(3).split("\n").filter(Boolean);
    var sequenceState = rows.join("\n");
    if (sequenceState === lastSequenceState) return;
    lastSequenceState = sequenceState;
    var sequences = rows.map(function (row) {
      var fields = row.split("\t");
      return { id: decode(fields[0] || ""), name: decode(fields[1] || "Unnamed Sequence"), active: fields[2] === "1" };
    });
    sequences = applySequenceOrder(sequences);
    var activeSequence = sequences.filter(function (sequence) { return sequence.active; })[0];
    sourceLabel.hidden = !activeSequence;
    sourceLabel.textContent = activeSequence ? "Source: " + activeSequence.name : "";
    sequenceList.textContent = "";

    if (!sequences.length) {
      setStatus("No sequences found in the current project.", "");
      return;
    }

    sequences.forEach(function (sequence) {
      var row = document.createElement("div");
      row.className = "sequence-row";
      row.setAttribute("role", "listitem");
      row.setAttribute("data-sequence-id", sequence.id);

      var dragHandle = document.createElement("button");
      dragHandle.type = "button";
      dragHandle.className = "sequence-drag-handle";
      dragHandle.textContent = "⋮⋮";
      dragHandle.title = "Drag to reorder";
      dragHandle.setAttribute("aria-label", "Drag to reorder " + sequence.name);
      dragHandle.addEventListener("pointerdown", function (event) {
        if (event.button !== 0 || event.isPrimary === false) return;
        event.preventDefault();
        draggedRow = row;
        dragPointerId = event.pointerId;
        dragStartY = event.clientY;
        dragMoved = false;
        if (typeof dragHandle.setPointerCapture === "function") dragHandle.setPointerCapture(event.pointerId);
      });
      dragHandle.addEventListener("lostpointercapture", finishDraggedSequence);

      var button = document.createElement("button");
      button.type = "button";
      button.className = "sequence-button";
      button.disabled = sequence.active;

      var name = document.createElement("span");
      name.className = "sequence-name";
      name.textContent = sequence.name;
      var action = document.createElement("span");
      action.className = "sequence-action";
      action.textContent = sequence.active ? "Active" : "Paste";
      button.appendChild(name);
      button.appendChild(action);

      if (!sequence.active) {
        button.addEventListener("click", function () { copyToSequence(sequence, button); });
      }
      row.appendChild(dragHandle);
      row.appendChild(button);
      sequenceList.appendChild(row);
    });
    setStatus("Click a destination sequence to append after its last clip.", "");
  }

  function refreshSequences(onComplete) {
    var cep = hostApi();
    if (!cep || isRefreshing) return;
    isRefreshing = true;
    cep.evalScript("sequenceKeeperGetSequences()", function (result) {
      isRefreshing = false;
      renderSequences(result);
      if (typeof onComplete === "function") onComplete(result);
    });
  }

  function copyToSequence(sequence, button) {
    var cep = hostApi();
    if (!cep) return;
    button.disabled = true;
    setStatus("Appending clips to \"" + sequence.name + "\"...", "");
    cep.evalScript("sequenceKeeperDirectInsertToSequence(" + JSON.stringify(sequence.id) + ")", function (result) {
      showCopyResult(result, button);
    });
  }

  function removeAllGaps() {
    var cep = hostApi();
    if (!cep) return;
    removeGapsButton.disabled = true;
    setStatus("Removing gaps from the active sequence...", "");
    cep.evalScript("sequenceKeeperRemoveGaps()", function (result) {
      removeGapsButton.disabled = false;
      if (result && result.indexOf("OK|") === 0) {
        setStatus(decode(result.substring(3)), "success");
        refreshSequences();
      } else {
        setStatus(decode((result || "The operation failed.").replace(/^ERROR\|/, "")), "error");
      }
    });
  }

  removeGapsButton.addEventListener("click", removeAllGaps);
  refreshSequences();
  window.setInterval(refreshSequences, 1000);
}());