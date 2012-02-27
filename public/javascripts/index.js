$(function() {

  $.mobile.showPageLoadingMsg();

  $('body').delegate('.course-button', 'click', function() { 

    $.mobile.changePage('#course-page');

    console.log('Debugging...');

  });

  mFeedback.randomizeLogo();

});