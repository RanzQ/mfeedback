$(function() {

  mFeedback.randomizeLogo();

  $('#search-form').submit(function(e) {
    if($('#query').val() === '') {
      e.preventDefault();
      return false;
    } 
  });

});

// jQuery Mobile configuration
$(document).bind("mobileinit", function(){
  $.extend( $.mobile, {
    defaultPageTransition: 'slide'
  });
});