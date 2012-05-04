$(function() {

  mFeedback.randomizeLogo();

  $(document).on('pageshow', function(){

    $('#search-form').submit(function(e) {
      if($('#query').val() === '') {
        e.preventDefault();
        return false;
      } 
    });

    $('#feedback-form').submit(function(e) {
      if($('#message').val() === '') {
        e.preventDefault();
        return false;
      } 
    });


    $('.double-back').click(function() {
      console.log('Back clicked!');
      history.go(-2);
    });

    $('#vote-form a').click(function() {
      if($(this).hasClass('vote-button-up')) {
        $('#vote-form input').val('up');
      } else {
        $('#vote-form input').val('down');
      }
      $('#vote-form').submit();
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
