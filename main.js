/*!
 * main.js
 *
 */
 
(function ($, window, undefined) {
	$(window).load(function(){
		$('#sample1-1').calendarPicker();
	});

	$(window).load(function(){
		$('#sample2-1').calendarPicker({
			disabledDay: [5, 6]
		});
	});
})(jQuery, this)
