const axios = require('axios');
function tryConnect(serverAddress, onSuccess, onError) {
  axios.get(serverAddress.replace(/\/$/, '') + '/roots')
    .then(r => {
      if (r.data.success) {
        onSuccess && onSuccess(r.data.roots);
      } else {
        onError && onError('서버 연결 실패');
      }
    })
    .catch(err => {
      onError && onError('서버 연결 실패 (' + err + ')');
    });
}
module.exports = { tryConnect };
