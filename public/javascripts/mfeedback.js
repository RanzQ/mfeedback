var mFeedback = (function(){

  function randomizeLogo() {

    var color = Math.round(Math.random()*2); // 0, 1 or 2
    var sign = Math.round(Math.random()*2);  // 0, 1 or 2

    $('.aalto-logo').css('background-position', (-sign*48) +'px ' + (-8-color*48) + 'px');

  }

  // Define public functions
  return {  
    randomizeLogo: randomizeLogo
  }

})();
