/*!
 * main.js
 *
 */
 
(function ($, window, undefined) {
	$(window).load(function(){
		$('#sample1-1').calenderPicker();
	});

	$(window).load(function(){
		$('#sample2-1').calenderPicker({
			disabledDay: [5, 6]
		});
	});
})(jQuery, this)
