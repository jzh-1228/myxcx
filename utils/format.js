function pad(num) {
  return num < 10 ? `0${num}` : `${num}`;
}

function formatDraftTime(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startThat = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startToday - startThat) / 86400000);

  if (diffDays === 0) {
    return `今天 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  if (diffDays === 1) {
    return '昨天';
  }
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function uid(prefix) {
  return `${prefix || 'id'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = {
  formatDraftTime,
  uid
};
