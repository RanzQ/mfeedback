$(function() {

  mFeedback.randomizeLogo();

  // This should enable swipe navigation, doesn't seem to work though
	$('body').delegate('.ui-page','swipeleft swiperight',function(event){
		if (event.type == "swiperight") {
			var prev = $("#prevlink",$.mobile.activePage);
			if (prev.length) {
				var prevurl = $(prev).attr("href");
				console.log(prevurl);
				$.mobile.changePage(prevurl);
			}
		}
		if (event.type == "swipeleft") {
			var next = $("#nextlink",$.mobile.activePage);
			if (next.length) {
				var nexturl = $(next).attr("href");
				console.log(nexturl);
				$.mobile.changePage(nexturl);
			}
		}
		event.preventDefault();
	});



});