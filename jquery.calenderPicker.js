/*!
 * jquery.calendarPicker.js
 *
 * @varsion   1.0
 * @require   jquery.js
 * @create    2012-11-12
 * @modify    2012-11-16
 * @author    rin316 [Yuta Hayashi]
 * @link      https://github.com/rin316/jquery.calendarPicker/
 */

/*
 * TODO 単独カレンダーの表示に対応させる
 *
 */


;(function ($, window, undefined) {
'use strict'

var CalendarPicker;
var PLUGIN_NAME = 'calendarPicker';
var DEFAULT_OPTIONS;

/**
 * DEFAULT_OPTIONS
 */
DEFAULT_OPTIONS = {
	 inputSelector:           '.wgt-calendar-input'
	,showButtonSelector:      '.wgt-calendar-btn'
	,calendarWrapperSelector: '.wgt-calendar-wrapper'
	,calendarSelector:        '.wgt-calendar-item'
	,calendarDateSelector:    'td a'
	,calendarTrMonthSelector: '.wgt-calendar-table-tr-month'
	,calendarThMonthSelector: '.wgt-calendar-table-th-month'
	,prevSelector:            '.wgt-calendar-prev'
	,nextSelector:            '.wgt-calendar-next'
	,selectYearSelector:      '.wgt-calendar-select-year'
	,selectMonthSelector:     '.wgt-calendar-select-month'
	,disableClassName:        'wgt-calendar-disabled'
	,selectedClassName:       'wgt-calendar-selected'
	,movedCalendarInBody:     true
	,movedSelectsInTh:        false
	,calendarZIndex:          3
	,setClassOnSat:           'wgt-calendar-sat' //className || false - 土曜日のcellにclassを付与する。falseで無効
	,setClassOnSun:           'wgt-calendar-sun' //className || false - 日曜日のcellにclassを付与する。falseで無効
	,setDisabledOnWeek:       false //array (e.g. [5, 6]) || false - 特定の曜日にdisableClassを付与。[0:月 1:火 2:水 3:木 4:金 5:土 6:日] falseで無効
	,setDisabledOnblankDay:   true //true || false - 空白のcellにdisableClassを付与する。falseで無効
};

/**
 * CalendarPicker
 */
CalendarPicker = function (element, options) {
	var  self = this
		,date
		;
	self.o = $.extend({}, DEFAULT_OPTIONS, options);
	self.$element         = $(element);
	self.$input           = self.$element.find(self.o.inputSelector);
	self.$showBtn         = self.$element.find(self.o.showButtonSelector);
	self.$calendarWrapper = self.$element.find(self.o.calendarWrapperSelector);
	self.$calendar        = self.$calendarWrapper.find(self.o.calendarSelector);
	self.$calendarDate    = self.$calendar.find(self.o.calendarDateSelector);
	self.$calendarTr      = self.$calendar.find('tr').not(self.o.calendarTrMonthSelector);//年月のtitle thを除外
	self.$calendarThMonth = self.$calendar.find(self.o.calendarThMonthSelector);
	self.$prev            = self.$calendarWrapper.find(self.o.prevSelector);
	self.$next            = self.$calendarWrapper.find(self.o.nextSelector);
	self.$selectYear      = self.$calendarWrapper.find(self.o.selectYearSelector);
	self.$selectMonth     = self.$calendarWrapper.find(self.o.selectMonthSelector);
	self.$select          = self.$selectMonth.add(self.$selectYear);

	self.index            = null;
	self.indexYear        = null;
	self.indexMonth       = null;

	date = new Date;
	//2つ並んだカレンダーのうち右側をcurrentとして計算するために、currentMonthを1ヶ月進ませる
	date.setMonth(date.getMonth() + 1);
	self.currentYear      = date.getFullYear();
	self.currentMonth     = date.getMonth() + 1;
	self.currentDate      = date.getDate();
	self.init();
};


/**
 * CalendarPicker.prototype
 */
(function (fn) {
	/**
	 * init
	 */
	fn.init = function () {
		var self = this
			,index;

		//今月のindexに更新
		index = self._getIndex({
			 year: self.currentYear
			,month: self.currentMonth
		});
		self._indexUpdate(index);
		self._prepareDomInBody();
		self._setPos();
		//年,月のselect要素内にoptionを生成(data属性から取得)
		self._createSelectOptions();
		//月のselect要素内option を indexYear年の月一覧に更新
		self._refreshSelectMonth();
		//年,月のselect要素内option の selectedを更新
		self._refreshSelectSelected();
		//年,月のselect要素をtable th内に移動
		self._prepareSelectsDomInTh('init');
		self._displayCalendar('hide');
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
		//click calendar表示button
		self.$element.on('click', self.o.showButtonSelector, function (e) {
			//index番目のcalendarが非表示ならば表示する
//			console.log( self.$calendar.eq(0)[0] );
			console.log( self.index );
			if (self.$calendar.eq(self.index).is(':hidden')) {
				self._displayCalendar('show');
			} else {
				self._displayCalendar('hide');
			}
			e.preventDefault();
			e.stopPropagation();
		});

		//click calendar日付cell
		self.$calendarWrapper.on('click', self.o.calendarSelector + ' ' + self.o.calendarDateSelector, function (e) {
			var  $this = $(this)
				,date = $this.attr('data-calendar-date')
				;
			//もし$calendarDateのclassが disabledだったら処理を停止
			if (self._isDisabled($this)) { return false; }
			self.$input.val(date);

			self.$calendarDate.removeClass(self.o.selectedClassName);
			$this.addClass(self.o.selectedClassName);

			self._displayCalendar('hide');
			e.preventDefault();
		});

		/**
		 * Event > Control
		 */
		//click prev button
		self.$calendarWrapper.on('click', self.o.prevSelector, function (e) {
			self._prev();
			e.preventDefault();
		});

		//click next button
		self.$calendarWrapper.on('click', self.o.nextSelector, function (e) {
			self._next();
			e.preventDefault();
		});

		//change select year
		//$selectYearの値が変わった時に$selectMonth内のoptionを書き換える
		self.$calendarWrapper.on('change', self.o.selectYearSelector, function (e) {
			var  selectedYear = self.$selectYear.val()
				,selectedMonth = self.$selectMonth.val()
				;
			//月のselect要素内option を indexYear年の月一覧に更新
			self._refreshSelectMonth(selectedYear);
			//年変更後もselectedだった月を維持する
			self.$selectMonth.val(selectedMonth);
		});

		//change select year, select month
		self.$calendarWrapper.on('change', self.o.selectYearSelector + ',' + self.o.selectMonthSelector, function (e) {
			var  index
				,selectedYear = self.$selectYear.val()
				,selectedMonth = self.$selectMonth.val()
				;
			//selectedされたoptionのindexに更新
			index = self._getIndex({
				 year: selectedYear
				,month: selectedMonth
			});
			self._indexUpdate(index);
			//年,月のselect要素内option の selectedを更新
			self._refreshSelectSelected();
			//年,月のselect要素をtable th内に移動
			self._prepareSelectsDomInTh();
			self._displayCalendar('show');
			self._showButton();
		});

		/**
		 * Event > show Area, hide Area
		 */
		//$calendarWrapperの領域外をclickしたら$calendarWrapperを閉じる
		$(document).on('click', function (e) {
			self._displayCalendar('hide');
		});

		//$calendarWrapperの領域内をclickしても閉じないようにbubbling stop
		self.$calendarWrapper.on('click', function (e) {
			e.stopPropagation();
		});

		/**
		 * Event > resize
		 */
		//resize時にcalendar位置を修正
		$(window).on('resize', function () {
			self._setPos();
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
		toIndex = (toIndex > self.$calendar.length - 1) ? self.$calendar.length - 1 : toIndex;
		//updata index number
		self.index = toIndex;
		//updata index year, index month
		self.indexYear  = parseFloat( self.$calendar.eq(self.index).attr('data-calendar-year') );
		self.indexMonth = parseFloat( self.$calendar.eq(self.index).attr('data-calendar-month') );
	};

	/**
	 * _getIndex
	 * 引数setDateから検索したcalendarのindexを返す
	 * getDate.year:  {number} - getDate.year年の要素を探す
	 * getDate.month: {number} - getDate.month月の要素を探す
	 */
	fn._getIndex = function (getDate) {
		var self = this
			,index
			;
		self.$calendar.each(function (i) {
			var  $this = $(this)
				,dataYear  = parseFloat($this.attr('data-calendar-year'))
				,dataMonth = parseFloat($this.attr('data-calendar-month'))
				,getYear   = parseFloat(getDate.year)
				,getMonth  = parseFloat(getDate.month)
				;
			if (dataYear  === getYear &&
				dataMonth === getMonth){
				//見つかったcalendarのindex番号を返す
				index = i;
				return false; //break
			}
		});
		return index;
	};

	/**
	 * _displayCalendar
	 * indexとその次の番号のcalendarを表示
	 */
	fn._displayCalendar = function (context) {
		var self = this;
		switch (context) {
			//表示
			case 'show':
				self.$calendarWrapper.show();
				self.$calendar.hide();
				self.$calendar.eq(self.index).show()
					.prev().show();
				break;
			//非表示
			case 'hide':
				self.$calendarWrapper.hide();
				self.$calendar.hide();
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

		self.$calendar.each(function (i) {
			var  $this = $(this)
				,thisYear  = parseFloat($this.attr('data-calendar-year'))
				,thisMonth = parseFloat($this.attr('data-calendar-month'))
				;
			//最初の月を除外するためにcontinueで抜ける
			//TODO 単独カレンダー表示(未実装)の時にcontinue不要
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
	 * _prepareDomInBody
	 * body直下に $calendarWrapper を移動する
	 */
	fn._prepareDomInBody = function () {
		if (this.o.movedCalendarInBody){
			$('body').append(this.$calendarWrapper);
		}
	};

	/**
	 * _setPos
	 * $inputの左下に来るよう $calendarWrapper に position set
	 */
	fn._setPos = function () {
		if (this.o.movedCalendarInBody){
			var self = this
				,inputX = self.$input.offset().left
				,inputY = self.$input.offset().top
				,inputH = self.$input.outerHeight()
				;
			//set position
			self.$calendarWrapper.css({
				 position: 'absolute'
				,zIndex: self.o.calendarZIndex
				,left: inputX
				,top: inputY + inputH
			});
		}
	};

	/**
	 * _prepareSelectsDomInTh
	 * select要素をcalendar内thに移動する
	 */
	fn._prepareSelectsDomInTh = function (context) {
		if (this.o.movedSelectsInTh){
			var self = this;
			//th.dataにth.textをset
			if (context === 'init'){
				self.$calendarThMonth.each(function () {
					var $this = $(this);
					$this.data('calendar-th', $this.text());
				});
			}
			//selectをindexのthに移動
			self.$calendarThMonth.eq(self.index).html(self.$select);
			//一旦元のtextに戻す
			self.$calendarThMonth.each(function () {
				var $this = $(this);
				if($this.find('select')[0]) { return true; }//IE9 fix - selectを含む場合は削除しない
				$this.html($this.data('calendar-th'));
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
		if (this.o.setClassOnSat || this.o.setClassOnSun || this.o.setDisabledOnWeek || this.o.setDisabledOnblankDay) {
			var self = this;
			self.$calendarTr.each(function () {
				var $this = $(this),
					$thisChildren
					;
				//$thisChildrenを td aとしてset。見つからなければth(曜日のcell)としてset
				$thisChildren = (function () {
					var item = $this.find(self.o.calendarDateSelector);
					return (item[0]) ? item : $this.find('th')
				})();

				//textが空白の場合はdisableClassNameをset
				if (self.o.setDisabledOnblankDay) {
					$thisChildren.each(function () {
						$this = $(this);
						if ($this.text().match(/(\s|\u00A0)/)) {
							$this.addClass(self.o.disableClassName);
						}
					});
				}
				//tr td aにdisableClassNameをset
				if (self.o.setDisabledOnWeek) {
					for (var i = 0, length = self.o.setDisabledOnWeek.length; i < length; i++) {
						$($thisChildren[ self.o.setDisabledOnWeek[i] ]).addClass(self.o.disableClassName);
					}
				}

				//$thisChildren が a要素の場合は親のtdに設定し直す (IE6 fix - aに複数のclassを指定するとcssが最後のclassにしか効かないので、tdとaに分けてclassをsetする)
				$thisChildren = ($thisChildren.is('th')) ? $thisChildren : $thisChildren.parent();
				//tr th, tr td に土曜・日曜のclassをset
				$($thisChildren[5]).addClass(self.o.setClassOnSat);
				$($thisChildren[6]).addClass(self.o.setClassOnSun);
			});
		}
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
	 * 前のcalendarを表示する
	 */
	fn._prev = function () {
		var self = this;
		self._indexUpdate(self.index - 2);
		//月のselect要素内option を indexYear年の月一覧に更新
		self._refreshSelectMonth();
		//年,月のselect要素内option の selectedを更新
		self._refreshSelectSelected();
		//年,月のselect要素をtable th内に移動
		self._prepareSelectsDomInTh();
		self._displayCalendar('show');
		self._showButton();
	};

	/**
	 * _next
	 * 次のcalendarを表示する
	 */
	fn._next = function () {
		var self = this;
		self._indexUpdate(self.index + 2);
		//月のselect要素内option を indexYear年の月一覧に更新
		self._refreshSelectMonth();
		//年,月のselect要素内option の selectedを更新
		self._refreshSelectSelected();
		//年,月のselect要素をtable th内に移動
		self._prepareSelectsDomInTh();
		self._displayCalendar('show');
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
		// calendar2つ分表示のため、-2 している
		return (this.index >= this.$calendar.length - 1) ? false : true;
	};

})(CalendarPicker.prototype);


/**
 * $.fn.calendarPicker
 */
$.fn[PLUGIN_NAME] = function (options) {
	return this.each(function () {
		//data属性にPLUGIN_NAME Objがなければインスタンス作成
		if (!$.data(this, PLUGIN_NAME)) {
			$.data(this, PLUGIN_NAME, new CalendarPicker(this, options));
		} else {
			//data属性にPLUGIN_NAME Objが既にあれば、PLUGIN_NAME + i 名でインスタンス作成
			for (var i = 2; true; i++) {
				if (!$.data(this, PLUGIN_NAME + i)) {
					$.data(this, PLUGIN_NAME + i, new CalendarPicker(this, options));
					break;
				}
			}
		}
	});
};


})(jQuery, this);
