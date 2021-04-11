'use strict';

const threshold = 150; //required min distance traveled to be considered swipe
const allowedTime = 1000; // maximum time allowed to travel that distance

let startX, startY, startTime;

export default function registerSwapListener(jq, cb)
{
    let dist, startX, startY;
    jq.on('touchstart',
    (e) =>
    {
        if (!jq.get().includes(e.target))
            return;

        let touchobj = e.changedTouches[0]
        dist = 0
        startX = touchobj.pageX
        startY = touchobj.pageY
        startTime = new Date().getTime()
    })

    jq.on('touchend', (e) =>
    {
        let touchobj = e.changedTouches[0]
        let dist = touchobj.pageX - startX;
        let elapsedTime = new Date().getTime() - startTime;

        let swipeValid = (elapsedTime <= allowedTime && Math.abs(dist) >= threshold && Math.abs(touchobj.pageY - startY) <= 100)
        if (swipeValid)
        {
            cb(dist > 0?"->":"<-");
        }
    })
}
