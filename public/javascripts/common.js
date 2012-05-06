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
      if($('#feedback-message').val() === '') {
        e.preventDefault();
        return false;
      } 
    });

    $('#submit-feedback').parent().hide();

    $('#feedback-message').on('focus', function(e) {
      $('#submit-feedback').parent().show();
    });
    $('#feedback-message').on('blur', function(e) {
      $('#submit-feedback').parent().hide();
    });

    $('#cancel-reply').click(function(e) {
      $('#feedback-dialog a[title="Close"]').click();
      return false;
    });

    $('li.feedback').hover(function() {
      $(this).css('cursor','pointer')
             .removeClass('ui-btn-up-a')
             .addClass('ui-btn-hover-a');
    }, function() {
      $(this).css('cursor','auto')
             .addClass('ui-btn-up-a')
             .removeClass('ui-btn-hover-a');
    });

    $('li.feedback').click(function(e) {
      var $this = $(this)
        , $id = $this.attr('data-feedback-id')
        , $body = $this.children().clone();

      $('#dialog-content').attr('data-feedback-id', $id);
      $('#dialog-content .feedback').empty().append($body);
      $('#open-dialog').click();
      return false;
    });

    $(".vote-button").click(function(e) {
        e.preventDefault();
        var $this = $(this)
          , votetype = $this.data('votetype');

        if(votetype !== undefined) {
          $.ajax({
            type: "POST",
            url: window.location,
            data: ({'votetype': votetype}),
            cache: false,
            success: function(data) {
              $('.messages').text(data.msg);
              if (data.votes) {
                var upvotes = data.votes.up ? '+' + data.votes.up : ''
                  , downvotes = data.votes.down ? '-' + data.votes.down : '';
                $('.upvotes').text(upvotes);
                $('.downvotes').text(downvotes);
              }
            }
          });
        }
        return false;
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
