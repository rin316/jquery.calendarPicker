/*!
 * jquery.calenderPicker.js
 *
 * @varsion   1.0
 * @require   jquery.js
 * @create    2012-11-20
 * @modify    2012-11-20
 * @author    rin316 [Yuta Hayashi]
 * @link      https://github.com/rin316/jquery.calenderPicker/
 */
;(function ($, window, undefined) {
'use strict'

var CalenderPicker;
var PLUGIN_NAME = 'calenderPicker';
var DEFAULT_OPTIONS;

/**
 * DEFAULT_OPTIONS
 */
DEFAULT_OPTIONS = {
	 inputSelector:           '.wgt-calender-input'
	,showButtonSelector:      '.wgt-calender-btn'
	,calenderWrapperSelector: '.wgt-calender-wrapper'
	,calenderSelector:        '.wgt-calender'
	,calenderDateSelector:    'td a'
	,calenderTrMonthSelector: '.wgt-calender-table-tr-month'
	,calenderThMonthSelector: '.wgt-calender-table-th-month'
	,prevSelector:            '.wgt-calender-prev'
	,nextSelector:            '.wgt-calender-next'
	,selectYearSelector:      '.wgt-calender-select-year'
	,selectMonthSelector:     '.wgt-calender-select-month'
	,disableClassName:        'wgt-calender-disable'
	,selectedClassName:       'wgt-calender-selected'
	,satClassName:            'wgt-calender-sat' //false || className
	,sunClassName:            'wgt-calender-sun' //false || className
	,movedCalenderInBody:     true
	,movedSelectsInTh:        false
	,disabledDay: false //false || array || e.g. [5, 6] - 特定の曜日選択を無効にする [0:月 1:火 2:水 3:木 4:金 5:土 6:日]
};

/**
 * CalenderPicker
 */
CalenderPicker = function (element, options) {
	var  self = this
		,date
		;
	self.o = $.extend({}, DEFAULT_OPTIONS, options);
	self.$element         = $(element);
	self.$input           = self.$element.find(self.o.inputSelector);
	self.$showBtn         = self.$element.find(self.o.showButtonSelector);
	self.$calenderWrapper = self.$element.find(self.o.calenderWrapperSelector);
	self.$calender        = self.$calenderWrapper.find(self.o.calenderSelector);
	self.$calenderDate    = self.$calender.find(self.o.calenderDateSelector);
	self.$calenderTr      = self.$calender.find('tr').not(self.o.calenderTrMonthSelector);//年月のtitle thを除外
	self.$calenderThMonth = self.$calender.find(self.o.calenderThMonthSelector);
	self.$prev            = self.$calenderWrapper.find(self.o.prevSelector);
	self.$next            = self.$calenderWrapper.find(self.o.nextSelector);
	self.$selectYear      = self.$calenderWrapper.find(self.o.selectYearSelector);
	self.$selectMonth     = self.$calenderWrapper.find(self.o.selectMonthSelector);
	self.$select          = self.$selectMonth.add(self.$selectYear);

	self.index            = null;
	self.indexYear        = null;
	self.indexMonth       = null;

	date = new Date;
	//currentMonthを1ヶ月進ませる
	date.setMonth(date.getMonth() + 1);
	self.currentYear      = date.getFullYear();
	self.currentMonth     = date.getMonth() + 1;
	self.currentDate      = date.getDate();
	self.init();
};


/**
 * CalenderPicker.prototype
 */
(function (fn) {
	/**
	 * init
	 */
	fn.init = function () {
		var self = this;

		//今月のindexに更新
		self._filterItem({
			 year: self.currentYear
			,month: self.currentMonth
		});

		self._movedCalenderInBody();
		//年,月のselect要素内にoptionを生成(data属性から取得)
		self._createSelectOptions();
		//月のselect要素内option を indexYear年の月一覧に更新
		self._refreshSelectMonth();
		//年,月のselect要素内option の selectedを更新
		self._refreshSelectSelected();
		//年,月のselect要素をtable th内に移動
		self._movedSelectsInTh('init');
		self._displayCalender('hide');
		self._setClass();
		self._showButton();
		//Eventをbind
		self._eventify();
	};

	/**
	 * _eventify
	 * Eventをbind
	 */
	fn._eventify = function () {
		var  self = this;
		/**
		 * Event
		 */
		//click calender表示button
		self.$element.on('click', self.o.showButtonSelector, function (e) {
			//index番目のcalenderが非表示ならば表示する
			if (self.$calender.eq(self.index).is(':hidden')) {
				self._displayCalender('show');
			} else {
				self._displayCalender('hide');
			}
			e.preventDefault();
			e.stopPropagation();
		});

		//click calender日付cell
		self.$calenderWrapper.on('click', self.o.calenderSelector + ' ' + self.o.calenderDateSelector, function (e) {
			var  $this = $(this)
				,date = $this.attr('data-calender-date')
				;
			//もし$calenderDateのclassが disabledだったら処理を停止
			if (self._isDisabled($this)) { return false; }
			self.$input.val(date);

			self.$calenderDate.removeClass(self.o.selectedClassName);
			$this.addClass(self.o.selectedClassName);

			self._displayCalender('hide');
			e.preventDefault();
		});

		/**
		 * Event > Control
		 */
		//click prev button
		self.$calenderWrapper.on('click', self.o.prevSelector, function (e) {
			self._prev();
			e.preventDefault();
		});

		//click next button
		self.$calenderWrapper.on('click', self.o.nextSelector, function (e) {
			self._next();
			e.preventDefault();
		});

		//change select year
		//$selectYearの値が変わった時に$selectMonth内のoptionを書き換える
		self.$calenderWrapper.on('change', self.o.selectYearSelector, function (e) {
			var  selectedYear = self.$selectYear.val()
				,selectedMonth = self.$selectMonth.val()
				;
			//月のselect要素内option を indexYear年の月一覧に更新
			self._refreshSelectMonth(selectedYear);
			//年変更後もselectedだった月を維持する
			self.$selectMonth.val(selectedMonth);
		});

		//change select year, select month
		self.$calenderWrapper.on('change', self.o.selectYearSelector + ',' + self.o.selectMonthSelector, function (e) {
			var  selectedYear = self.$selectYear.val()
				,selectedMonth = self.$selectMonth.val()
				;
			//selectedされたoptionの年,月カレンダーを表示
			self._filterItem({
				 year: selectedYear
				,month: selectedMonth
			});
			//年,月のselect要素内option の selectedを更新
			self._refreshSelectSelected();
			//年,月のselect要素をtable th内に移動
			self._movedSelectsInTh();
			self._displayCalender('show');
			self._showButton();
		});

		/**
		 * Event > show Area, hide Area
		 */
		//$calenderWrapperの領域外をclickしたら$calenderWrapperを閉じる
		$(document).on('click', function (e) {
			self._displayCalender('hide');
		});

		//$calenderWrapperの領域内をclickしても閉じないようにbubbling stop
		self.$calenderWrapper.on('click', function (e) {
			e.stopPropagation();
		});
	};

	/**
	 * _indexUpdate
	 * indexを更新。indexの値が0より小さければ0に、最大値より大きければ最大値にリセット
	 * index: {number} - {number}番目のindexに更新
	 */
	fn._indexUpdate = function (index) {
		var  self = this
			,toIndex = index
			;
		toIndex = (toIndex < 1) ? 1 : toIndex;
		toIndex = (toIndex > self.$calender.length - 1) ? self.$calender.length - 1 : toIndex;
		//updata index number
		self.index = toIndex;
		//updata index year, index month
		self.indexYear  = parseFloat( self.$calender.eq(self.index).attr('data-calender-year') );
		self.indexMonth = parseFloat( self.$calender.eq(self.index).attr('data-calender-month') );
	};

	/**
	 * _filterItem
	 * indexを 引数のyearとmonthから検索した要素のindex番号 に更新(data属性から検索)
	 * year:  {number} - year年の要素を探す
	 * month: {number} - month月の要素を探す
	 */
	fn._filterItem = function (option) {
		var self = this;
		self.$calender.each(function (index) {
			var  $this = $(this)
				,thisYear  = parseFloat($this.attr('data-calender-year'))
				,thisMonth = parseFloat($this.attr('data-calender-month'))
				;
			if (thisYear  === parseFloat(option.year) &&
				thisMonth === parseFloat(option.month)){
				//見つかった要素のindex番号に更新
				self._indexUpdate(index);
			}
		});
	};

	/**
	 * _displayCalender
	 * indexとその次の番号のcalenderを表示
	 */
	fn._displayCalender = function (context) {
		var self = this;
		switch (context) {
			//表示
			case 'show':
				self.$calenderWrapper.show();
				self.$calender.hide();
				self.$calender.eq(self.index).show()
					.prev().show();
				break;
			//非表示
			case 'hide':
				self.$calenderWrapper.hide();
				self.$calender.hide();
				break;
		}
	};

	/**
	 * _createSelectOptions
	 * 年,月のselect要素内にoptionを生成(data属性から取得)
	 */
	fn._createSelectOptions = function () {
		var  self = this
			,optionYear = []
			;
		self.optionYear = '';
		self.optionMonth = {};

		self.$calender.each(function (i) {
			var  $this = $(this)
				,thisYear  = parseFloat($this.attr('data-calender-year'))
				,thisMonth = parseFloat($this.attr('data-calender-month'))
				;
			//最初の月を除外するためにcontinueで抜ける
			if (i === 0) { return true; }

			//年の生成
			//optionYearの最後の値 と thisYear が同じ値でなければ配列に値を追加(値を重複させない)
			if (optionYear[optionYear.length - 1] !== thisYear){
				optionYear.push(thisYear);
				self.optionYear += '<option value="' + thisYear + '">' + thisYear + '年</option>';
			}
			//月の生成
			//未定義ならば空文字で定義
			if(self.optionMonth[thisYear] === undefined) { self.optionMonth[thisYear] = ''; }
			self.optionMonth[thisYear] += '<option value="' + thisMonth + '">' + thisMonth + '月</option>';
		});
		//select内にoptionを生成
		self.$selectYear.html(self.optionYear);
		self.$selectMonth.html(self.optionMonth[self.currentYear]);
	};

	/**
	 * _movedCalenderInBody
	 * $calenderWrapper をbody直下に移動する
	 */
	fn._movedCalenderInBody = function () {
		if (this.o.movedCalenderInBody){
			var self = this
				,inputX
				,inputY
				,inputH
				;
			inputX = self.$input.offset().left;
			inputY = self.$input.offset().top;
			inputH = self.$input.outerHeight();
			//移動
			$('body').append(self.$calenderWrapper);
			//set position
			self.$calenderWrapper.css({
				position: 'absolute'
				,left: inputX
				,top: inputY + inputH
			});
		}
	};

	/**
	 * _movedSelectsInTh
	 * select要素をcalender thに移動する
	 */
	fn._movedSelectsInTh = function (context) {
		if (this.o.movedSelectsInTh){
			var self = this;
			//th.dataにth.textをset
			if (context === 'init'){
				self.$calenderThMonth.each(function () {
					var $this = $(this);
					$this.data('calender-th', $this.text());
				});
			}
			//selectをindexのthに移動
			self.$calenderThMonth.eq(self.index).html(self.$select);
			//一旦元のtextに戻す
			self.$calenderThMonth.each(function () {
				var $this = $(this);
				if($this.find('select')[0]) { return true; }//IE9 fix - selectを含む場合は削除しない
				$this.html($this.data('calender-th'));
			});
		}
	};

	/**
	 * _refreshSelectMonth
	 * 月のselect要素内option を indexYear年の月一覧に更新
	 */
	fn._refreshSelectMonth = function (year) {
		this.$selectMonth.html(this.optionMonth[year || this.indexYear]);
		//IE6 fix - 幅を再調整し「selected プロパティを設定できませんでした。 未定義のエラーです」を回避 http://d.hatena.ne.jp/x6x6/20080318/1205817536
		this.$selectMonth.width();
	};

	/**
	 * _refreshSelectSelected
	 * 年,月のselect要素内option の selectedを更新
	 */
	fn._refreshSelectSelected = function () {
		this.$selectYear.val(this.indexYear);
		this.$selectMonth.val(this.indexMonth);
	};

	/**
	 * _setClass
	 * 各cellに土日やdisabledのclassをsetする
	 */
	fn._setClass = function () {
		var self = this;
		self.$calenderTr.each(function () {
			var $this = $(this),
				$thisChildren
				;
			//$thisChildrenを td aとしてset。見つからなければth(曜日のcell)としてset
			$thisChildren = (function () {
				var item = $this.find(self.o.calenderDateSelector);
				return (item[0]) ? item : $this.find('th')
			})();
			//textが空白の場合はdisableClassNameをset
			$thisChildren.each(function () {
				$this = $(this);
				if ($this.text().match(/(\s|\u00A0)/)) {
					$this.addClass(self.o.disableClassName);
				}
			});
			//tr td aにdisableClassNameをset
			if (self.o.disabledDay) {
				for (var i = 0, length = self.o.disabledDay.length; i < length; i++) {
					$($thisChildren[ self.o.disabledDay[i] ]).addClass(self.o.disableClassName);
				}
			}

			//$thisChildren が a要素の場合は親のtdに設定し直す (IE6 fix - aに複数のclassを指定するとcssが最後のclassにしか効かないので、tdとaに分けてclassをsetする)
			$thisChildren = ($thisChildren.is('th')) ? $thisChildren : $thisChildren.parent();
			//tr th, tr td に土曜・日曜のclassをset
			$($thisChildren[5]).addClass(self.o.satClassName);
			$($thisChildren[6]).addClass(self.o.sunClassName);
		});
	};

	/**
	 * _isDisabled
	 * 引数$objのclassに disabled があればtrueを、なければfalseを返す
	 */
	fn._isDisabled = function ($obj) {
		return ($obj.hasClass(this.o.disableClassName)) ? true: false;
	};

	/**
	 * _prev
	 * 前のcalenderを表示する
	 */
	fn._prev = function () {
		var self = this;
		self._indexUpdate(self.index - 2);
		//月のselect要素内option を indexYear年の月一覧に更新
		self._refreshSelectMonth();
		//年,月のselect要素内option の selectedを更新
		self._refreshSelectSelected();
		//年,月のselect要素をtable th内に移動
		self._movedSelectsInTh();
		self._displayCalender('show');
		self._showButton();
	};

	/**
	 * _next
	 * 次のcalenderを表示する
	 */
	fn._next = function () {
		var self = this;
		self._indexUpdate(self.index + 2);
		//月のselect要素内option を indexYear年の月一覧に更新
		self._refreshSelectMonth();
		//年,月のselect要素内option の selectedを更新
		self._refreshSelectSelected();
		//年,月のselect要素をtable th内に移動
		self._movedSelectsInTh();
		self._displayCalender('show');
		self._showButton();
	};

	/**
	 * _showButton
	 * 「前へ・次へ」buttonの表示を切り替える
	 */
	fn._showButton = function () {
		var self = this;
		//前の要素があれば「前へ」を表示。無ければ隠す
		(self._hasPrev())
			? self.$prev.show()
			: self.$prev.hide()
		;
		//次の要素があれば「次へ」を表示。無ければ隠す
		(self.hasNext())
			? self.$next.show()
			: self.$next.hide()
		;
	};

	/**
	 * _hasPrev
	 * 前の要素があるかを判定。無ければfalseを、あればtrueを返す
	 */
	fn._hasPrev = function () {
		return (this.index <= 1) ? false : true;
	};

	/**
	 * hasNext
	 * 次の要素があるかを判定。無ければfalseを、あればtrueを返す
	 */
	fn.hasNext = function () {
		// calender2つ分表示のため、-2 している
		return (this.index >= this.$calender.length - 1) ? false : true;
	};

})(CalenderPicker.prototype);


/**
 * $.fn.calenderPicker
 */
$.fn[PLUGIN_NAME] = function (options) {
	return this.each(function () {
		if (!$.data(this, PLUGIN_NAME)) {
			$.data(this, PLUGIN_NAME, new CalenderPicker(this, options));
		}
	});
};


})(jQuery, this);
