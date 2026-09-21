(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var payloads = {};
  var modules = ["student-tasks", "student-info", "lab-rules", "equipment"];
  var sources = {
    "student-tasks": { file: "../student-board/board.enc.json", label: "Student Tasks" },
    "student-info": { file: "../student-info/info.enc.json", label: "Student Info" },
    "lab-rules": { file: "../lab-rules/rules.enc.json", label: "Lab Rules" },
    equipment: { file: "../equipment-board/equipment.enc.json", label: "Lab Equipment" }
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char];
    });
  }

  function b64(value) { return Uint8Array.from(atob(value), function (char) { return char.charCodeAt(0); }); }

  function dateLabel(value, fallback) {
    if (!value) return fallback || "更新时间未记录";
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? (fallback || "更新时间未记录") : "更新时间：" + date.toLocaleString("zh-CN", { hour12: false });
  }

  async function decryptFile(source, password) {
    var response = await fetch(source.file + "?v=" + Date.now(), { cache: "no-store" });
    if (!response.ok) throw new Error("数据尚未发布");
    var pack = await response.json();
    if (!pack.data) throw new Error("数据尚未发布");
    var material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    var key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(pack.salt), iterations: pack.iterations || 210000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    var cipher = new Uint8Array([].concat(Array.from(b64(pack.data)), Array.from(b64(pack.tag))));
    var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(pack.iv), tagLength: 128 }, key, cipher);
    var text = new TextDecoder().decode(plain);
    return source.html ? { html: text, publishedAt: pack.publishedAt } : JSON.parse(text);
  }

  function renderTasks(data) {
    $("tasksUpdatedAt").textContent = dateLabel(data.publishedAt, "同步时间未记录");
    $("taskGroups").innerHTML = (data.groups || []).map(function (group) {
      return '<section class="group panel"><h3>' + escapeHtml(group.name) + '</h3>' + (group.students || []).map(function (student) {
        var history = student.history || [];
        var historyMarkup = history.length ? '<details class="history"><summary>历史任务（' + history.length + '）</summary><div class="history-list">' + history.map(function (item, index) {
          return '<article class="history-item"><div><strong>历史任务 ' + (history.length - index) + '</strong><time>组会：' + escapeHtml(item.meetingDate || "未记录") + '</time><time>发布：' + escapeHtml(dateLabel(item.publishedAt, "未记录").replace("更新时间：", "")) + '</time></div><p>' + escapeHtml(item.task || "暂无任务内容") + '</p></article>';
        }).join("") + '</div></details>' : '<div class="history-empty">暂无更早的历史任务</div>';
        return '<article class="student-task"><div class="task"><strong>' + escapeHtml(student.displayName) + '</strong><div>' + escapeHtml(student.latestTask || "暂无当前任务") + '</div><time>组会：' + escapeHtml(student.meetingDate || "未记录") + '</time></div>' + historyMarkup + '</article>';
      }).join("") + '</section>';
    }).join("") || '<section class="panel empty-panel">暂无学生任务数据。</section>';
  }

  function renderInfo(data) {
    $("infoUpdatedAt").textContent = dateLabel(data.updatedAt);
    $("studentRows").innerHTML = (data.overview || []).map(function (item) {
      return '<tr><td><strong>' + escapeHtml(item.name) + '</strong></td><td>' + escapeHtml(item.email || "未填写") + '</td><td>' + escapeHtml(item.service || "未设置") + '</td><td>' + escapeHtml(item.workstation || "未分配") + '</td><td>' + escapeHtml(item.projects || "未参与项目") + '</td></tr>';
    }).join("");
  }

  function renderRules(data) {
    $("rulesUpdatedAt").textContent = dateLabel(data.updatedAt);
    $("ruleSections").innerHTML = (data.sections || []).map(function (section) {
      return '<section class="panel rule"><h3>' + escapeHtml(section.title) + '</h3><ol>' + (section.items || []).map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join("") + '</ol></section>';
    }).join("");
  }

  function renderEquipmentRows() {
    var query = $("equipmentSearch").value.trim().toLowerCase();
    var status = $("equipmentStatus").value;
    var items = (payloads.equipment.items || []).filter(function (item) {
      var searchable = [item.name, item.model, item.quantity, item.location, item.currentOwner, item.notes].join(" ").toLowerCase();
      return (!status || item.status === status) && (!query || searchable.indexOf(query) !== -1);
    });
    $("equipmentRows").innerHTML = items.map(function (item) {
      return '<tr><td>' + escapeHtml(item.index) + '</td><td><strong>' + escapeHtml(item.name) + '</strong></td><td>' + escapeHtml(item.model || "—") + '</td><td>' + escapeHtml(item.quantity || 1) + '</td><td>' + escapeHtml(item.location || "—") + '</td><td>' + escapeHtml(item.currentOwner || "未设置") + '</td><td>' + escapeHtml(item.status || "—") + '</td><td>' + escapeHtml(item.notes || "") + '</td></tr>';
    }).join("");
    $("equipmentEmpty").hidden = items.length !== 0;
  }

  function renderEquipment(data) {
    $("equipmentUpdatedAt").textContent = dateLabel(data.updatedAt);
    renderEquipmentRows();
  }

  function selectModule(module) {
    var selected = modules.indexOf(module) === -1 ? "student-tasks" : module;
    modules.forEach(function (id) {
      $(id).hidden = id !== selected;
      document.querySelector('[data-panel="' + id + '"]').classList.toggle("active", id === selected);
    });
    if (location.hash.slice(1) !== selected) history.replaceState(null, "", "#" + selected);
  }

  function renderAll() {
    renderTasks(payloads["student-tasks"]);
    renderInfo(payloads["student-info"]);
    renderRules(payloads["lab-rules"]);
    renderEquipment(payloads.equipment);
    $("updatedAt").textContent = "已在当前浏览器中解锁全部 Management 信息";
    $("unlock").hidden = true;
    $("workspace").hidden = false;
    selectModule(location.hash.slice(1));
  }

  function clearWorkspace() {
    payloads = {};
    $("workspace").hidden = true;
    $("unlock").hidden = false;
    $("taskGroups").replaceChildren();
    $("studentRows").replaceChildren();
    $("ruleSections").replaceChildren();
    $("equipmentRows").replaceChildren();
    $("loadNotice").hidden = true;
    $("password").focus();
  }

  $("unlockForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    var password = $("password").value;
    $("message").textContent = "正在本地解密四个模块…";
    var results = await Promise.allSettled(modules.map(function (module) { return decryptFile(sources[module], password); }));
    password = "";
    $("password").value = "";
    var failures = [];
    results.forEach(function (result, index) {
      var module = modules[index];
      if (result.status === "fulfilled") payloads[module] = result.value;
      else failures.push(sources[module].label);
    });
    if (failures.length) {
      payloads = {};
      $("message").textContent = failures.length === modules.length ? "密码不正确，或管理数据尚未发布。" : "部分模块无法读取：" + failures.join("、");
      return;
    }
    $("message").textContent = "";
    renderAll();
  });

  document.querySelectorAll("[data-panel]").forEach(function (button) {
    button.addEventListener("click", function () { selectModule(button.dataset.panel); });
  });
  window.addEventListener("hashchange", function () { if (!$("workspace").hidden) selectModule(location.hash.slice(1)); });
  $("lock").addEventListener("click", clearWorkspace);
  $("equipmentSearch").addEventListener("input", function () { if (payloads.equipment) renderEquipmentRows(); });
  $("equipmentStatus").addEventListener("change", function () { if (payloads.equipment) renderEquipmentRows(); });
}());
