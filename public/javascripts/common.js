$(function() {

  mFeedback.randomizeLogo();

});

$(document).on('pageshow', function(){

  $('#search-form').submit(function(e) {
    if($('#query').val() === '') {
      e.preventDefault();
      return false;
    } 
  });

  $('#feedback-dialog').hide();
  $('#feedback-dialog').data('hidden', true);

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

  $('body').on('vclick', '#cancel-reply',function(e) {
    $('#feedback-dialog').hide();
    return false;
  });

  $('body').on('vclick', '#submit-reply',function(e) {
    if($('#reply-message').val() === '') return false;

    $('#reply-form').submit();

    // if(feedbackid !== undefined) {
    //   $.ajax({
    //     type: "POST",
    //     url: window.location,
    //     data: ({'feedbackid': feedbackid,
    //             'message': message}),
    //     cache: false,
    //     success: function(data) {
    //       $(document.getElementById('#feedback-page')).remove();
    //       $.mobile.changePage('#feedback-page');
    //     }
    //   });
    // }

    return false;
  });

  $('body').on('vclick', '.dialog-vote-button',function(e) {
    $('#dialog-votetype').val($(this).data('votetype'));
    $('#reply-message').val('');
    $('#reply-form').submit();
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

  $('body').on('vclick', 'li.feedback', function(e) {

    var $dialog = $('#feedback-dialog');


    var $this = $(this)
      , $id = $this.data('feedback-id');

    $('#dialog-feedbackid').val($id);
    $('#feedback-dialog').appendTo($this).show();
    $('#reply-message').focus();

  });

  $(".vote-button").on('vclick', function(e) {
    e.preventDefault();
    var $this = $(this)
      , votetype = $this.data('votetype')
      , feedbackid;

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

  $('.more').on('vclick', function(e) {
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
