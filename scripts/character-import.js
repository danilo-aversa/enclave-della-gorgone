(function () {
  "use strict";

  var IMPORT_ENDPOINT =
    "https://atglgaritxzowshenaqr.supabase.co/functions/v1/import-character";
  var IMPORT_SECRET = "Gorgone-Import-9f4kLm2Qx7pR8vT1zA";
  var SUPABASE_ANON_KEY =
    "2feb795825a5bd8dd7f73a8f45273ba1f0423b091c754083418ceb32d08ccf85";

  document.addEventListener("DOMContentLoaded", initCharacterImportModal);

  function initCharacterImportModal() {
    var elements = {
      openButton: document.querySelector("[data-character-import-action]"),
      modal: document.querySelector("[data-character-import-modal]"),
      closeBackdrop: document.querySelector("[data-character-import-close]"),
      cancelButton: document.querySelector("[data-character-import-cancel]"),
      form: document.querySelector("[data-character-import-form]"),
      jsonInput: document.querySelector("[data-character-json-file]"),
      portraitInput: document.querySelector("[data-character-portrait-file]"),
      submitButton: document.querySelector("[data-character-import-submit]"),
      status: document.querySelector("[data-character-import-status]"),
    };

    if (!elements.openButton || !elements.modal || !elements.form) {
      console.warn("Componenti modal import personaggio non trovati.");
      return;
    }

    elements.openButton.addEventListener("click", function onOpenClick(event) {
      event.preventDefault();

      if (elements.openButton.disabled) {
        return;
      }

      openModal(elements);
    });

    if (elements.closeBackdrop) {
      elements.closeBackdrop.addEventListener("click", function onBackdropClick() {
        closeModal(elements);
      });
    }

    if (elements.cancelButton) {
      elements.cancelButton.addEventListener("click", function onCancelClick() {
        closeModal(elements);
      });
    }

    document.addEventListener("keydown", function onEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      if (elements.modal.hidden) {
        return;
      }

      closeModal(elements);
    });

    elements.form.addEventListener("submit", function onImportSubmit(event) {
      event.preventDefault();
      submitImport(elements);
    });
  }

  function openModal(elements) {
    elements.modal.hidden = false;
    setStatus(elements, "", "");

    if (elements.jsonInput) {
      elements.jsonInput.focus();
    }
  }

  function closeModal(elements) {
    elements.modal.hidden = true;
    elements.form.reset();
    setStatus(elements, "", "");
  }

  async function submitImport(elements) {
    var jsonFile = elements.jsonInput && elements.jsonInput.files ? elements.jsonInput.files[0] : null;
    var portraitFile =
      elements.portraitInput && elements.portraitInput.files ? elements.portraitInput.files[0] : null;

    if (!jsonFile) {
      setStatus(elements, "Seleziona il file JSON personaggio.", "is-error");
      return;
    }

    if (!portraitFile) {
      setStatus(elements, "Seleziona il file Portrait.", "is-error");
      return;
    }

    if (!isPortraitFileValid(portraitFile)) {
      setStatus(elements, "Formato Portrait non valido. Usa JPG, PNG o WEBP.", "is-error");
      return;
    }

    setStatus(elements, "Import in corso...", "is-pending");
    setSubmitting(elements, true);

    try {
      var jsonText = await jsonFile.text();
      var actorData;

      try {
        actorData = JSON.parse(jsonText);
      } catch (parseError) {
        throw new Error("Il file JSON non è valido.");
      }

      var formData = new FormData();
      formData.append("character_json", jsonFile);
      formData.append("portrait_image", portraitFile);

      var response = await fetch(IMPORT_ENDPOINT, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + SUPABASE_ANON_KEY,
          "x-import-secret": IMPORT_SECRET,
        },
        body: formData,
      });

      var payload = await parseResponseBody(response);

      if (!response.ok) {
        throw new Error(readErrorMessage(payload, response.status));
      }

      if (!payload || payload.success !== true) {
        throw new Error(readErrorMessage(payload, response.status));
      }

      var characterName =
        readString(payload.name, "") ||
        readString(payload.characterName, "") ||
        readString(payload.character && payload.character.name, "") ||
        readString(actorData.name, "personaggio");

      setStatus(elements, "Import completato: " + characterName + ".", "is-success");
    } catch (error) {
      setStatus(
        elements,
        "Import non riuscito: " + readString(error && error.message, "errore inatteso."),
        "is-error"
      );
      console.warn("Errore import personaggio:", error);
    } finally {
      setSubmitting(elements, false);

      if (elements.jsonInput) {
        elements.jsonInput.value = "";
      }

      if (elements.portraitInput) {
        elements.portraitInput.value = "";
      }
    }
  }

  function isPortraitFileValid(file) {
    var allowedExt = ["jpg", "jpeg", "png", "webp"];
    var name = readString(file.name, "").toLowerCase();
    var ext = name.includes(".") ? name.split(".").pop() : "";

    if (allowedExt.indexOf(ext) !== -1) {
      return true;
    }

    var type = readString(file.type, "").toLowerCase();
    return type === "image/jpeg" || type === "image/png" || type === "image/webp";
  }

  async function parseResponseBody(response) {
    var bodyText = await response.text();

    if (!bodyText) {
      return null;
    }

    try {
      return JSON.parse(bodyText);
    } catch (error) {
      return { message: bodyText };
    }
  }

  function readErrorMessage(payload, statusCode) {
    var payloadMessage =
      readString(payload && payload.error, "") ||
      readString(payload && payload.message, "") ||
      readString(payload && payload.details, "");

    if (payloadMessage) {
      return payloadMessage;
    }

    return "Richiesta non riuscita (" + statusCode + ").";
  }

  function setStatus(elements, message, stateClass) {
    if (!elements.status) {
      return;
    }

    elements.status.textContent = message;
    elements.status.classList.remove("is-success", "is-error", "is-pending");

    if (stateClass) {
      elements.status.classList.add(stateClass);
    }
  }

  function setSubmitting(elements, isSubmitting) {
    if (elements.submitButton) {
      elements.submitButton.disabled = isSubmitting;
    }

    if (elements.cancelButton) {
      elements.cancelButton.disabled = isSubmitting;
    }

    if (elements.jsonInput) {
      elements.jsonInput.disabled = isSubmitting;
    }

    if (elements.portraitInput) {
      elements.portraitInput.disabled = isSubmitting;
    }
  }

  function readString(value, fallback) {
    return typeof value === "string" && value.trim() !== "" ? value : fallback;
  }
})();