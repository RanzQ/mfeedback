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
