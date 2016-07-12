"use strict";

define(['distance', 'lib', 'waypoints'], function (distance, lib, waypoints) {
	return {
		timer: null, //setInterval(updateLNAV, 5000);

		/**
		 * Controls LNAV, plane's lateral navigation, set on a timer
		 */
		update: function () {
			var d = distance.route(waypoints.nextWaypoint);
			if (d <= distance.turn(60)) {
				lib.activateLeg(waypoints.nextWaypoint + 1);
			}
			clearInterval(this.timer);
			if (d < gefs.aircraft.animationValue.kias / 60) this.timer = setInterval(this.update, 500);
			else this.timer = setInterval(this.update, 30000);
		}
	};
});