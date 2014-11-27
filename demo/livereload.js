(function(){
    var ws = new WebSocket('ws://' + location.hostname + ':9081');
    ws.onmessage = function (m){
        if (m.data === 'RELOAD')
            location.reload();
    };
}());
