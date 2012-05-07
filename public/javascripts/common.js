$(function() {

  mFeedback.randomizeLogo();

});

$(document).on('pageinit', function(){

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
  // $('#feedback-message').on('blur', function(e) {
  //   $('#submit-feedback').parent().hide();
  // });

  $('#cancel-reply').click(function(e) {
    $('#feedback-dialog a[title="Close"]').click();
    return false;
  });

  $('#submit-reply').click(function(e) {
    feedbackid = $('#dialog-content').data('feedback-id');

    message = $('#reply-message').val();
    console.log(message);

    if(feedbackid !== undefined) {
      $.ajax({
        type: "POST",
        url: window.location,
        data: ({'feedbackid': feedbackid,
                'message': message}),
        cache: false//,
        // success: function(data) {
        //   $('.messages').text(data.msg);
        //   if (data.votes) {
        //     var upvotes = data.votes.up ? '+' + data.votes.up : ''
        //       , downvotes = data.votes.down ? '-' + data.votes.down : '';
        //     $('.upvotes').text(upvotes);
        //     $('.downvotes').text(downvotes);
        //   }
        // }
      });
    }

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
      , $id = $this.data('feedback-id')
      , $body = $this.children().clone();

    console.log($id);
    $('#dialog-content').data('feedback-id', $id);
    $('#dialog-content .feedback').empty().append($body);
    $('#open-dialog').click();
    return false;
  });

  $(".vote-button").click(function(e) {
    e.preventDefault();
    var $this = $(this)
      , votetype = $this.data('votetype')
      , feedbackid;

    // Check if the button was from dialog
    if($this.hasClass('dialog')) {
      feedbackid = $('#dialog-content').data('feedback-id');
      console.log(feedbackid);
    }

    if(votetype !== undefined) {
      $.ajax({
        type: "POST",
        url: window.location,
        data: ({'votetype': votetype,
                'feedbackid': feedbackid}),
        cache: false//,
        // success: function(data) {
        //   $('.messages').text(data.msg);
        //   if (data.votes) {
        //     var upvotes = data.votes.up ? '+' + data.votes.up : ''
        //       , downvotes = data.votes.down ? '-' + data.votes.down : '';
        //     $('.upvotes').text(upvotes);
        //     $('.downvotes').text(downvotes);
        //   }
        // }
      });
    }
    return false;
  });

  $('.more').click(function(e) {
    e.preventDefault();
    var $this = $(this)
      , eventType = $this.data('event-type')
      , page = $this.data('page');

    $this.attr('disabled', 'disabled');

    var loc = window.location.href.toString()
      , more_url = loc.endsWith('/') ? 'more' : '/more';

    $.ajax({
      type: "GET",
      url: window.location + more_url,
      data: ({'t': eventType, 'p': page}),
      cache: false,
      success: function(data) {
        var res = data.res
          , target = data.target;

        //console.log(data.hasMore);

        if (data.hasMore === 0) {
          $this.parents('li').hide();
        }

        var c = null
          , html = '';
        for (var i=0, j=res.length; i<j; i++) {
          c = res[i];

          html = [
          '<li>', 
            '<a href="', c.full_url,'">',
              c.title,
            '</a>',
            '<span class="ui-li-count">',
              c.feedback_length,
            '</span>',
          '</li>'
          ].join('');

          //console.log(html);
          
          $(html).insertBefore(target);
        }
        $('.event-list').listview('refresh');
        $this.data('page', data.nextPage);
      },
      complete: function() {
        $this.removeAttr('disabled');
      }
    });
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


// jQuery Mobile configuration
$(document).bind("mobileinit", function() {


  $.extend($.mobile, {
    defaultPageTransition: 'slide'
  });

  $.mobile.page.prototype.options.addBackBtn = true;

});

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};
