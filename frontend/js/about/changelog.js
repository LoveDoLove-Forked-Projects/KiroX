/** @file 更新说明的受限 Markdown 渲染。 */

export function renderChangelog(md) {
  const esc = function (s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  const inline = function (s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code class="changelog-code">$1</code>');
  };

  const lines = md.split('\n');
  let html = '';
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const li = line.match(/^[-*]\s+(.+)/);
    const blank = line.trim() === '';

    if (h2) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += '<div class="cl-h2">' + inline(h2[1]) + '</div>';
    } else if (h3) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += '<div class="cl-h3">' + inline(h3[1]) + '</div>';
    } else if (li) {
      if (!inList) {
        html += '<ul class="cl-list">';
        inList = true;
      }
      html += '<li>' + inline(li[1]) + '</li>';
    } else if (blank) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += '<p class="cl-p">' + inline(line) + '</p>';
    }
  }
  if (inList) html += '</ul>';
  return html;
}
