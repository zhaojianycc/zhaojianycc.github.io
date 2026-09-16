(function () {
  "use strict";

  var target = document.getElementById("protected-email");
  if (!target) return;

  var codes = [122, 104, 97, 111, 106, 105, 97, 110, 121, 99, 99, 64, 115, 106, 116, 117, 46, 101, 100, 117, 46, 99, 110];
  var address = String.fromCharCode.apply(null, codes);
  var link = document.createElement("a");
  link.href = "mailto:" + address;
  link.textContent = address;
  target.replaceChildren(link);
}());
