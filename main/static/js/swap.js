function listen_to_swaps(jq, cb)
{
    let dist, startX, startY;
    jq.on('touchstart',
    function(e)
    {
        //touchsurface.innerHTML = ''
        var touchobj = e.changedTouches[0]
        dist = 0
        startX = touchobj.pageX
        startY = touchobj.pageY
        startTime = new Date().getTime() // record time when finger first makes contact with surface
    })

    jq.on('touchend', function(e)
    {
        var touchobj = e.changedTouches[0]
        dist = touchobj.pageX - startX // get total dist traveled by finger while in contact with surface
        elapsedTime = new Date().getTime() - startTime // get time elapsed
        // check that elapsed time is within specified, horizontal dist traveled >= threshold, and vertical dist traveled <= 100
        var swiperightBol = (elapsedTime <= allowedTime && Math.abs(dist) >= threshold && Math.abs(touchobj.pageY - startY) <= 100)
        if (swiperightBol)
        {
            cb(dist > 0?"->":"<-");
        }
    })
}

let startX,
    startY,
    dist,
    threshold = 150, //required min distance traveled to be considered swipe
    allowedTime = 200, // maximum time allowed to travel that distance
    elapsedTime,
    startTime;

    window.addEventListener('touchstart', function(e){
        //touchsurface.innerHTML = ''
        var touchobj = e.changedTouches[0]
        dist = 0
        startX = touchobj.pageX
        startY = touchobj.pageY
        startTime = new Date().getTime() // record time when finger first makes contact with surface



		event.target.addEventListener('touchend', function(e)
        {

			var touchobj = e.changedTouches[0]
			dist = touchobj.pageX - startX // get total dist traveled by finger while in contact with surface
			elapsedTime = new Date().getTime() - startTime // get time elapsed
			// check that elapsed time is within specified, horizontal dist traveled >= threshold, and vertical dist traveled <= 100
			var swiperightBol = (elapsedTime <= allowedTime && Math.abs(dist) >= threshold && Math.abs(touchobj.pageY - startY) <= 100)

			var dir_str = "none";
			var dir_int = 0;
			if(swiperightBol)
            {
				if(dist > 0)
                {
					dir_str = "right";
					dir_int = 1;
				}else{
					dir_str = "left";
					dir_int = 2;
				}
				var _e = new CustomEvent("swap", {
					target : event.target,
					detail: {
						direction : dir_str,
						direction_int : dir_int
					},
					bubbles: true,
					cancelable: true
				});
				trigger(event.target, "Swap", _e);
			}

			//handleswipe(swiperightBol, event.target);

		})

		function trigger(elem, name, event) {

			elem.dispatchEvent(event);
			eval(elem.getAttribute('on' + name));
		}

    })


    var keys = {37: 1, 38: 1, 39: 1, 40: 1};

    function preventDefault(e) {
      e.preventDefault();
    }

    function preventDefaultForScrollKeys(e) {
      if (keys[e.keyCode]) {
        preventDefault(e);
        return false;
      }
    }

    // modern Chrome requires { passive: false } when adding event
    var supportsPassive = false;
    try {
      window.addEventListener("test", null, Object.defineProperty({}, 'passive', {
        get: function () { supportsPassive = true; }
      }));
    } catch(e) {}

    var wheelOpt = supportsPassive ? { passive: false } : false;
    var wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';

    // call this to Disable
    function disableScroll(e) {
      e.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
      e.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
      e.addEventListener('touchmove', preventDefault, wheelOpt); // mobile
      e.addEventListener('keydown', preventDefaultForScrollKeys, false);
    }

    // call this to Enable
    function enableScroll(e) {
      e.removeEventListener('DOMMouseScroll', preventDefault, false);
      e.removeEventListener(wheelEvent, preventDefault, wheelOpt);
      e.removeEventListener('touchmove', preventDefault, wheelOpt);
      e.removeEventListener('keydown', preventDefaultForScrollKeys, false);
    }
