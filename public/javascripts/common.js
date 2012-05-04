$(function() {

  mFeedback.randomizeLogo();

  $('#search-form').submit(function(e) {
    if($('#query').val() === '') {
      e.preventDefault();
      return false;
    } 
  });

  $(document).on('pageshow', function(){
    $('.double-back').click(function() {
      console.log('Back clicked!');
      history.go(-2);
    });
  });


});

// jQuery Mobile configuration
$(document).bind("mobileinit", function() {


  $.extend($.mobile, {
    defaultPageTransition: 'slide'
  });

  $.mobile.page.prototype.options.addBackBtn = true;

});
