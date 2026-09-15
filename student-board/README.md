# Student task board ownership

This directory is the isolated publishing surface of the local Graduate Student Board project.

- `index.html`, `style.css`, and `app.js` are maintained deliberately as the student-facing shell.
- `board.enc.json` is generated automatically by the local management service.
- The encrypted payload contains only Chinese display names, latest tasks, source meeting dates, group names, and publish time.
- Do not replace `board.enc.json` with plaintext data or embed the shared password in this repository.
- Website-wide maintenance may change shared navigation only after coordinating with this page; the local publisher updates only `student-board/board.enc.json` during routine meeting publication.
