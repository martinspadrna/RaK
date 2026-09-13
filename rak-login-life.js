// RaK DEV – animated mascot crab for the login splash.
// This is intentionally NOT the static app icon. It is a dedicated vector crab
// inspired by the approved neon-crab concept so every body part can move.
(function(){
  const STYLE_ID='rak-login-life-style-v3';

  const ensureStyle=()=>{
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style'); s.id=STYLE_ID;
    s.textContent=`
      #rakUserLoginOverlay.rakSplash .rakSplashBrand{animation:none!important}
      #rakUserLoginOverlay.rakSplash .rakSplashLogo{animation:none!important;width:100%;height:100%;filter:drop-shadow(0 0 7px rgba(124,255,124,.42)) drop-shadow(0 0 28px rgba(124,255,124,.18))}
      .rakLivingLogo{position:relative;width:100%;height:100%;display:block;overflow:visible}
      .rakLivingLogo svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
      .rakLivingLogo .crabPart{transform-box:fill-box;transform-origin:center;will-change:transform}
      .rakLivingLogo .crabLeg1{animation:crabLeg1 1.35s ease-in-out infinite}
      .rakLivingLogo .crabLeg2{animation:crabLeg2 1.35s .17s ease-in-out infinite}
      .rakLivingLogo .crabLeg3{animation:crabLeg3 1.35s .34s ease-in-out infinite}
      .rakLivingLogo .crabLeg4{animation:crabLeg4 1.35s .51s ease-in-out infinite}
      .rakLivingLogo .crabLeg5{animation:crabLeg5 1.35s .68s ease-in-out infinite}
      .rakLivingLogo .crabLeg6{animation:crabLeg6 1.35s .85s ease-in-out infinite}
      .rakLivingLogo .crabLeg7{animation:crabLeg7 1.35s 1.02s ease-in-out infinite}
      .rakLivingLogo .crabLeg8{animation:crabLeg8 1.35s 1.19s ease-in-out infinite}
      .rakLivingLogo .crabClawL{animation:crabClawL 2.1s ease-in-out infinite}
      .rakLivingLogo .crabClawR{animation:crabClawR 2.1s 1.05s ease-in-out infinite}
      .rakLivingLogo .crabEyeL{animation:crabEyeL 4.8s ease-in-out infinite}
      .rakLivingLogo .crabEyeR{animation:crabEyeR 4.8s ease-in-out infinite}
      .rakLivingLogo .crabBlink{animation:crabBlink 4.8s ease-in-out infinite}
      .rakLivingLogo .crabBrowL,.rakLivingLogo .crabBrowR{animation:crabBrows 4.8s ease-in-out infinite}
      .rakLivingLogo .crabMouth{animation:crabMouth 3.6s ease-in-out infinite}
      @keyframes crabLeg1{0%,100%{transform:rotate(0) translate(0,0)}50%{transform:rotate(-8deg) translate(-4px,5px)}}
      @keyframes crabLeg2{0%,100%{transform:rotate(0) translate(0,0)}50%{transform:rotate(7deg) translate(4px,-3px)}}
      @keyframes crabLeg3{0%,100%{transform:rotate(0) translate(0,0)}50%{transform:rotate(-7deg) translate(-4px,4px)}}
      @keyframes crabLeg4{0%,100%{transform:rotate(0) translate(0,0)}50%{transform:rotate(8deg) translate(4px,-3px)}}
      @keyframes crabLeg5{0%,100%{transform:rotate(0) translate(0,0)}50%{transform:rotate(-7deg) translate(-3px,4px)}}
      @keyframes crabLeg6{0%,100%{transform:rotate(0) translate(0,0)}50%{transform:rotate(7deg) translate(3px,-3px)}}
      @keyframes crabLeg7{0%,100%{transform:rotate(0) translate(0,0)}50%{transform:rotate(-6deg) translate(-2px,3px)}}
      @keyframes crabLeg8{0%,100%{transform:rotate(0) translate(0,0)}50%{transform:rotate(6deg) translate(2px,-2px)}}
      @keyframes crabClawL{0%,100%{transform:rotate(0)}22%{transform:rotate(-8deg) translate(-4px,-2px)}48%{transform:rotate(5deg) translate(2px,3px)}72%{transform:rotate(-3deg)}}
      @keyframes crabClawR{0%,100%{transform:rotate(0)}22%{transform:rotate(8deg) translate(4px,-2px)}48%{transform:rotate(-5deg) translate(-2px,3px)}72%{transform:rotate(3deg)}}
      @keyframes crabEyeL{0%,38%,100%{transform:translate(0,0)}44%{transform:translate(-10px,2px)}52%{transform:translate(8px,-1px)}60%{transform:translate(0,0)}}
      @keyframes crabEyeR{0%,38%,100%{transform:translate(0,0)}44%{transform:translate(-8px,2px)}52%{transform:translate(10px,-1px)}60%{transform:translate(0,0)}}
      @keyframes crabBlink{0%,43%,47%,100%{transform:scaleY(1)}44.5%{transform:scaleY(.08)}46%{transform:scaleY(1)}}
      @keyframes crabBrows{0%,38%,100%{transform:translateY(0)}45%{transform:translateY(-3px)}54%{transform:translateY(1px)}}
      @keyframes crabMouth{0%,100%{transform:scaleX(1) scaleY(1)}45%{transform:scaleX(1.06) scaleY(.9)}55%{transform:scaleX(.96) scaleY(1.04)}}
      #rakUserLoginOverlay.rakSplash .rakSplashBrand.success .rakLivingLogo{animation:crabCharge .58s cubic-bezier(.2,.9,.2,1)!important}
      #rakUserLoginOverlay.rakSplash .rakSplashBrand.error .rakLivingLogo{animation:crabReject .62s cubic-bezier(.36,.07,.19,.97)!important}
      @keyframes crabCharge{0%{transform:scale(1)}45%{transform:scale(1.08)}72%{transform:scale(.98)}100%{transform:scale(1)}}
      @keyframes crabReject{0%,100%{transform:translateX(0) rotate(0)}12%{transform:translateX(-10px) rotate(-2deg)}26%{transform:translateX(10px) rotate(2deg)}40%{transform:translateX(-8px) rotate(-1.5deg)}55%{transform:translateX(7px) rotate(1.2deg)}72%{transform:translateX(-3px)}}
      @media(prefers-reduced-motion:reduce){.rakLivingLogo .crabPart,.rakLivingLogo .crabEyeL,.rakLivingLogo .crabEyeR,.rakLivingLogo .crabBlink,.rakLivingLogo .crabBrowL,.rakLivingLogo .crabBrowR,.rakLivingLogo .crabMouth{animation:none!important}}
    `;
    document.head.appendChild(s);
  };

  function livingSvg(){
    return `<svg class="rakSplashLogo" viewBox="0 0 1000 760" aria-hidden="true" focusable="false">
      <defs>
        <filter id="crabGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <linearGradient id="crabFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17351f"/><stop offset="1" stop-color="#07120b"/></linearGradient>
      </defs>
      <g fill="none" stroke="#7cff7c" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" filter="url(#crabGlow)">
        <g class="crabPart crabLeg1"><path d="M300 485 Q205 500 125 575 Q95 600 70 585"/><path d="M115 580 l-28 18"/></g>
        <g class="crabPart crabLeg2"><path d="M330 505 Q245 550 195 635 Q180 660 150 660"/><path d="M153 660 l-27 10"/></g>
        <g class="crabPart crabLeg3"><path d="M365 520 Q315 590 300 675 Q295 700 265 710"/><path d="M267 710 l-25 4"/></g>
        <g class="crabPart crabLeg4"><path d="M405 530 Q385 620 400 695 Q405 720 380 735"/><path d="M381 735 l-22 0"/></g>
        <g class="crabPart crabLeg5"><path d="M700 485 Q795 500 875 575 Q905 600 930 585"/><path d="M885 580 l28 18"/></g>
        <g class="crabPart crabLeg6"><path d="M670 505 Q755 550 805 635 Q820 660 850 660"/><path d="M847 660 l27 10"/></g>
        <g class="crabPart crabLeg7"><path d="M635 520 Q685 590 700 675 Q705 700 735 710"/><path d="M733 710 l25 4"/></g>
        <g class="crabPart crabLeg8"><path d="M595 530 Q615 620 600 695 Q595 720 620 735"/><path d="M619 735 l22 0"/></g>

        <g class="crabPart crabClawL"><path d="M305 355 Q225 325 165 270 Q125 235 105 175"/><path d="M105 175 Q60 130 95 80 Q135 25 195 65 Q235 95 220 145 Q205 195 160 205"/><path d="M105 175 Q80 135 100 100"/></g>
        <g class="crabPart crabClawR"><path d="M695 355 Q775 325 835 270 Q875 235 895 175"/><path d="M895 175 Q940 130 905 80 Q865 25 805 65 Q765 95 780 145 Q795 195 840 205"/><path d="M895 175 Q920 135 900 100"/></g>

        <path fill="url(#crabFill)" d="M235 405 Q255 315 355 275 Q500 215 645 275 Q745 315 765 405 Q755 495 665 530 Q500 580 335 530 Q245 495 235 405Z"/>
        <path d="M285 420 Q500 520 715 420" opacity=".55"/>

        <g class="crabPart crabBlink">
          <ellipse cx="410" cy="255" rx="62" ry="78" fill="#0b170d"/>
          <ellipse cx="590" cy="255" rx="62" ry="78" fill="#0b170d"/>
        </g>
        <g class="crabPart crabEyeL"><ellipse cx="410" cy="255" rx="49" ry="64" fill="#caffca"/><ellipse cx="418" cy="260" rx="28" ry="42" fill="#07120b"/><circle cx="428" cy="244" r="9" fill="#fff"/></g>
        <g class="crabPart crabEyeR"><ellipse cx="590" cy="255" rx="49" ry="64" fill="#caffca"/><ellipse cx="582" cy="260" rx="28" ry="42" fill="#07120b"/><circle cx="572" cy="244" r="9" fill="#fff"/></g>
        <path class="crabPart crabBrowL" d="M365 165 Q410 135 450 165"/>
        <path class="crabPart crabBrowR" d="M550 165 Q590 135 635 165"/>
        <path class="crabPart crabMouth" d="M430 370 Q500 425 570 370"/>
      </g>
      <g fill="#caffca" opacity=".8"><circle cx="145" cy="340" r="4"/><circle cx="855" cy="340" r="4"/><circle cx="205" cy="445" r="3"/><circle cx="795" cy="445" r="3"/></g>
    </svg>`;
  }

  const mount=()=>{
    const brand=document.getElementById('rakSplashBrand');
    if(!brand)return;
    if(!brand.querySelector('.rakLivingLogo')){
      const old=brand.querySelector('.rakSplashLogo');
      if(old){const holder=document.createElement('div');holder.className='rakLivingLogo';holder.innerHTML=livingSvg();old.replaceWith(holder)}
    }
  };
  const boot=()=>{ensureStyle();mount()};
  window.rakInstallLoginLife=boot;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  const start=()=>{if(document.body)new MutationObserver(()=>mount()).observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
