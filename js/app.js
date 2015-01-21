(function(){

  var app;
  var audioContext;
  var graphicContext;
  
  var MAXQ  = 30;
  var BAR_WIDTH = 8;
  
  var playMusic = function(){
    console.log("play");
    app.els.player.play();
  };
  
  var pauseMusic = function(){
    console.log("pause");
    app.els.player.pause();
  };

  var setMusic = function(){
    console.log("changing music");
    var music = this.result;
    app.els.player.src = window.URL.createObjectURL(music.blob);
    app.els.title.textContent = music.metadata.title;
    app.els.cover.src = window.URL.createObjectURL(music.metadata.picture);
    app.coverImage = app.els.cover;
  };

  var selectMusic = function(){
    console.log("call MozActivity");
    var req = new MozActivity({
      name: "pick",
      data: {
        type: "audio/mpeg"
      }
    });
    req.onsuccess = setMusic;
  };

  var changeFilter = function(){
    app.nodes.filter.type = app.els.filters.value;
  };

  var initNodes = function(){
    app.nodes.filter = app.contexts.audio.createBiquadFilter();
    app.nodes.filter.type = "allpass";
    
    app.nodes.analyser = app.contexts.audio.createAnalyser();
    app.fft = Uint8Array(app.nodes.analyser.frequencyBinCount);
    
    app.nodes.source = app.contexts.audio.createMediaElementSource(app.els.player);
    app.nodes.destination = app.contexts.audio.destination;

    app.nodes.source.connect(app.nodes.filter);
    app.nodes.filter.connect(app.nodes.analyser);
    app.nodes.filter.connect(app.nodes.destination);
  };

  var fade = function(){
    app.contexts.graphics.fillStyle = "rgba(255, 255, 255, .2)";
    app.contexts.graphics.fillRect(0, 0, app.els.geq.width, app.els.geq.height);
  };

  var scale = function(value, min, max, toMin, toMax){
    return (value - min) / max * (toMax - toMin) + toMin;
  };  

  var calcPositionFromFFTData = function(index){
    return {
      x: scale(index, 0, app.fft.length, 0, app.els.geq.width),
      y: app.els.geq.height - scale(app.fft[index], 0, 255, 0, app.els.geq.height)
    };
  };

  var drawCoverImage = function(){
    if(app.coverImage != null){
      app.contexts.graphics.drawImage(app.coverImage, 0, 0, app.els.geq.width, app.els.geq.height);
    }
  };

  var drawGraphicEqualiser = function(){
    app.nodes.analyser.getByteFrequencyData(app.fft);
    app.contexts.graphics.beginPath();
    for(var i = 0; i < app.fft.length; i = i + BAR_WIDTH){
      var pos = calcPositionFromFFTData(i);
      if(i == 0){
        app.contexts.graphics.moveTo(pos.x, pos.y);
      }else{
        app.contexts.graphics.lineTo(pos.x, pos.y);
      }
    }
    app.contexts.graphics.stroke();
  };

  var update = function(){
    fade();
    drawCoverImage();
    drawGraphicEqualiser();
    window.requestAnimationFrame(update);
  };

  var normalizeGEQPosition = function(value, max){
    return Math.min(1.0, value / max);
  };

  var isTouchEvent =  function(event){
    return event.touches && event.touches.length > 0;
  };

  var lastPosition = function(event){
    var lastPosition = event;
    if(isTouchEvent(event)){
      lastPosition = event.touches[event.touches.length - 1];
    }
    return lastPosition;
  };

  var extractPosition = function(event){
    var position = lastPosition(event);
    return {
      x: position.clientX,
      y: position.clientY
    };
  };

  var calcNormalizedPositionInGEQ = function(event){
    var position = extractPosition(event);
    return {x: normalizeGEQPosition(position.x - event.target.offsetLeft, app.els.geq.clientWidth),
            y : 1.0 - normalizeGEQPosition(position.y - event.target.offsetTop, app.els.geq.clientHeight)};
  };  

  var formatFilterParameter = function(value){
    var rounded = Math.floor(value * 100);
    var postfix = "";
    if(rounded % 100 == 0){
      postfix = ".00";
    }else if(rounded % 10 == 0){
      postfix = "0";
    }
    return rounded / 100 + postfix;
  };

  var displayFrequency = function(){
    app.els.frequency.textContent = formatFilterParameter(app.nodes.filter.frequency.value);
  };

  var displayQ = function(){
    app.els.Q.textContent = formatFilterParameter(app.nodes.filter.Q.value);
  };

  var displayFilterParameters = function(){
    displayFrequency();
    displayQ();
  };

  var changeFilterParameter = function(event){
    var position = calcNormalizedPositionInGEQ(event);
    app.nodes.filter.frequency.value = position.x * app.contexts.audio.sampleRate / 10;
    app.nodes.filter.Q.value = position.y * MAXQ;
    displayFilterParameters();
  };

  var boot = function(){
    console.log("app boot");
    app = {
      els:{
        player: document.querySelector("#audio-source"),
        play: document.querySelector("#play"),
        pause: document.querySelector("#pause"),
        select: document.querySelector("#select"),
        filters: document.querySelector("#filters"),
        geq: document.querySelector("#geq"),
        frequency: document.querySelector("#frequency"),
        Q: document.querySelector("#Q"),
        title: document.querySelector("#title"),
        cover: document.querySelector("#cover")
      },
      contexts:{
        audio: new AudioContext(),
        graphics: null
      },
      nodes: {
        filter: null,
        analyser: null,
        source: null,
        destination: null
      },
      fft: null,
      coverImage: null
    };

    app.contexts.graphics = app.els.geq.getContext("2d");

    initNodes();

    app.els.play.addEventListener("click", playMusic);
    app.els.pause.addEventListener("click", pauseMusic);
    app.els.select.addEventListener("click", selectMusic);
    app.els.filters.addEventListener("change", changeFilter);

    app.els.geq.addEventListener("mousemove", changeFilterParameter);
    app.els.geq.addEventListener("touchmove", changeFilterParameter);

    displayFilterParameters();

    update();
  };

  window.addEventListener("load", boot);
})();
