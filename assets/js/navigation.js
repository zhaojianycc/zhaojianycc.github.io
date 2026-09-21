(function () {
  var menu = document.getElementById("layout-menu");
  if (!menu) return;

  var page = location.pathname.split("/").pop() || "index.html";
  var groups = [
    { label: "Group", links: [["bio.html", "Principal Investigator"], ["people.html", "People"], ["news.html", "News"], ["leisure.html", "Group Life"]] },
    { label: "Research", links: [["topics.html", "Research Topics"], ["publications.html", "Publications"]] },
    { label: "Teaching & Service", links: [["teaching.html", "Teaching"], ["services.html", "Academic Service"]] },
    { label: "Resources", links: [["rtesim.html", "RTE-Sim"], ["memspn.html", "MEMS-PN"], ["n4000.html", "BCI N4000"]] },
    { label: "Management", links: [["management/#student-tasks", "Student Tasks"], ["management/#student-info", "Student Info"], ["management/#lab-rules", "Lab Rules"], ["management/#equipment", "Lab Equipment"], ["SOA-dashboard/", "SOA Dashboard"]] }
  ];

  function link(href, label, className) {
    var active = page.toLowerCase() === href.toLowerCase() ? " current" : "";
    return '<a class="' + (className || "") + active + '" href="' + href + '">' + label + '</a>';
  }

  var navigation = groups.map(function (group) {
    var active = group.links.some(function (item) { return page.toLowerCase() === item[0].toLowerCase(); });
    return '<details class="nav-group' + (active ? " active" : "") + '"><summary>' + group.label + '</summary><div class="nav-dropdown">' +
      group.links.map(function (item) { return link(item[0], item[1], "nav-link"); }).join("") +
      '</div></details>';
  }).join("");

  menu.innerHTML =
    '<a class="site-brand" href="index.html"><span class="brand-mark">JZ</span><span>Jian Zhao Research Group</span></a>' +
    '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-navigation"><span></span><span></span><span></span><span class="sr-only">Toggle navigation</span></button>' +
    '<nav id="site-navigation" class="site-navigation" aria-label="Primary navigation">' +
      link("index.html", "Home", "nav-home") + navigation +
      '<details class="nav-group nav-join"><summary>Join Us</summary><div class="nav-dropdown nav-dropdown-right">' +
        link("recruitment.html", "Open Positions", "nav-link") + link("contact.html", "Contact", "nav-link") +
      '</div></details>' +
    '</nav>';

  var toggle = menu.querySelector(".nav-toggle");
  var nav = menu.querySelector(".site-navigation");
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  var desktopPointer = window.matchMedia("(min-width: 901px) and (hover: hover) and (pointer: fine)");
  var details = Array.prototype.slice.call(menu.querySelectorAll(".nav-group"));

  function closeMenus(except) {
    details.forEach(function (item) {
      if (item !== except) item.removeAttribute("open");
    });
  }

  details.forEach(function (item) {
    var closeTimer;
    var summary = item.querySelector("summary");

    item.addEventListener("toggle", function () {
      if (item.open) closeMenus(item);
    });

    summary.addEventListener("click", function (event) {
      if (!desktopPointer.matches) return;
      event.preventDefault();
      closeMenus(item);
      item.setAttribute("open", "");
    });

    item.addEventListener("mouseenter", function () {
      window.clearTimeout(closeTimer);
      if (!desktopPointer.matches) return;
      closeMenus(item);
      item.setAttribute("open", "");
    });

    item.addEventListener("mouseleave", function () {
      if (!desktopPointer.matches) return;
      closeTimer = window.setTimeout(function () {
        item.removeAttribute("open");
      }, 120);
    });
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest("#site-navigation .nav-group")) closeMenus();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeMenus();
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}());
