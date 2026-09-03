'use client';

import * as React from "react";
import { useState, useEffect } from "react";
import type { SVGProps } from "react";
import { motion } from "framer-motion";

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789XØ▲█░▒▓#$&@_';

const SvgBastionHeroSection = (props: SVGProps<SVGSVGElement>) => {
  const targetText = "Bastion";
  const [displayText, setDisplayText] = useState(targetText);
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    let iteration = 0;
    let interval: NodeJS.Timeout;

    const startScramble = () => {
      iteration = 0;
      clearInterval(interval);
      interval = setInterval(() => {
        setDisplayText(
          targetText
            .split('')
            .map((char, index) => {
              if (index < iteration) {
                return targetText[index];
              }
              return CHARS[Math.floor(Math.random() * CHARS.length)];
            })
            .join('')
        );

        if (iteration >= targetText.length) {
          clearInterval(interval);
        }
        iteration += 1 / 3;
      }, 35);
    };

    startScramble();

    const glitchInterval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 220);
    }, 4000);

    return () => {
      clearInterval(interval);
      clearInterval(glitchInterval);
    };
  }, []);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      id="Bastion_Hero_Section_svg__Layer_1"
      viewBox="-373 0 2600 363.3"
      {...props}
    >
      <defs>
        <clipPath id="Bastion_Hero_Section_svg__clippath">
          <path
            d="M1784.3 326.5h-58.8c-6.1 0-11.1-5-11.1-11.1s5-11.1 11.1-11.1h58.8c6.1 0 11.1 5 11.1 11.1s-5 11.1-11.1 11.1m-58.8-21.7c-5.9 0-10.6 4.8-10.6 10.6s4.8 10.6 10.6 10.6h58.8c5.9 0 10.6-4.8 10.6-10.6s-4.8-10.6-10.6-10.6z"
            className="Bastion_Hero_Section_svg__st2"
          />
        </clipPath>
        <style>
          {
            ".Bastion_Hero_Section_svg__st0{font-size:14.3px;font-family:Sk-Modernist-Regular,Sk-Modernist,sans-serif}.Bastion_Hero_Section_svg__st0,.Bastion_Hero_Section_svg__st2{fill:#fff}.Bastion_Hero_Section_svg__st3{fill:none;stroke:#fff;stroke-miterlimit:10}.Bastion_Hero_Section_svg__st4{isolation:isolate}"
          }
        </style>
      </defs>
      <motion.g
        initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 3, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        style={{ transformOrigin: '800px 300px' }}
      >
        <text
          style={{
            fontFamily: "Sk-Modernist-Regular, Sk-Modernist, sans-serif",
            fill: "#fff",
            fontSize: "367.4px",
            filter: isGlitching ? 'drop-shadow(3px 0px #00ffff) drop-shadow(-3px 0px #ff0055)' : 'none',
          }}
          transform="translate(188.8 326.7)"
        >
          <tspan x={0} y={0}>
            {displayText}
          </tspan>
        </text>
      </motion.g>
      {/* Icon paths from Bastion_2_copy.svg */}
      <g>
        <path
          d="M37.4 326.7l65.9-109.2c19.9-33 33-40.7 83.5-40.7h58.1v149.9h-30.2v-120.7c-75.8 0-72.5-2.2-95.9 36.5l-48.8 84.2H37.4Z"
          fill="#fff"
        />
        <path
          d="M171.8 295.5v31.1h-54.2l5.3-10.1c3.9-6.9 7.1-13.3 12.8-16.2 0 0 6.6-4.6 18.1-4.6h18.3l-.2-.2Z"
          fill="#fff"
        />
      </g>
      <path
        d="M45.2 74.6l54.9 90.9c16.6 27.4 27.4 33.9 69.5 33.9h70s0-124.8 0-124.8h-25.1s0 100.5 0 100.5c-63.1 0-72 1.8-91.4-30.3l-40.6-70.1H45.2Z"
        fill="#fff"
      />
      <text
        className="Bastion_Hero_Section_svg__st0"
        transform="translate(1720.12 92.467)"
      >
        <tspan x={0} y={0}>
          {"You are "}
        </tspan>
        <tspan x={0} y={15.4}>
          {"now "}
        </tspan>
        <tspan x={0} y={30.8}>
          {"entering"}
        </tspan>
      </text>
      <text
        className="Bastion_Hero_Section_svg__st0"
        transform="translate(1713.69 161.599)"
      >
        <tspan x={0} y={0}>
          {"Time: 3 mns "}
        </tspan>
        <tspan x={0} y={15.4}>
          {"scroll "}
        </tspan>
        <tspan x={0} y={30.8}>
          {"to explore"}
        </tspan>
      </text>
      <text
        className="Bastion_Hero_Section_svg__st0"
        transform="translate(1713.436 230.732)"
      >
        <tspan x={0} y={0}>
          {"Intelligence "}
        </tspan>
        <tspan x={0} y={15.4}>
          {"Infrastructure "}
        </tspan>
        <tspan x={0} y={30.8}>
          {"Defence Platform"}
        </tspan>
      </text>
      <text
        className="Bastion_Hero_Section_svg__st0"
        transform="translate(1714.12 297.871)"
      >
        <tspan x={0} y={0}>
          {"Copyright \xA92026 "}
        </tspan>
      </text>
      <path
        d="M1694.4 79.6v45M1694.4 148.7v45M1694.2 217.9v45M1694.2 285v45"
        className="Bastion_Hero_Section_svg__st3"
      />
      <path
        d="m1751.5 320.9 3.7-6.2c1.1-1.9 1.9-2.3 4.7-2.3h3.3v8.5h-1.7v-7c-3.1 0-3.8-.4-5.3 2.1l-2.9 4.9z"
        className="Bastion_Hero_Section_svg__st2"
      />
      <path
        d="M1759.4 319.2v1.8h-3.1l.3-.6c.2-.4.4-.8.7-.9 0 0 .4-.3 1-.3h1Z"
        className="Bastion_Hero_Section_svg__st2"
      />
      <g className="Bastion_Hero_Section_svg__st4">
        <g className="Bastion_Hero_Section_svg__st4">
          <g className="Bastion_Hero_Section_svg__st4">
            <path
              d="M1784.7 317.5c0 .3 0 .5-.1.7s-.2.4-.4.6-.3.3-.6.4-.5.1-.7.1-.5 0-.7-.1-.4-.2-.6-.4-.3-.4-.4-.6-.1-.5-.1-.7 0-.5.1-.7.2-.4.4-.6.3-.3.6-.4.5-.1.7-.1.5 0 .7.1.4.2.6.4.3.4.4.6.1.5.1.7m-.4 0c0-.2 0-.4-.1-.6 0-.2-.2-.3-.3-.5-.1-.1-.3-.2-.5-.3s-.4-.1-.6-.1-.4 0-.6.1c-.2 0-.3.2-.5.3-.1.1-.2.3-.3.5s-.1.4-.1.6 0 .4.1.6c0 .2.2.3.3.5.1.1.3.2.5.3.2 0 .4.1.6.1s.4 0 .6-.1c.2 0 .3-.2.5-.3.1-.1.2-.3.3-.5 0-.2.1-.4.1-.6m-.6.3v.3s-.1.2-.2.2c0 0-.2.1-.3.1h-.7c-.1 0-.2-.2-.3-.3 0 0-.1-.2-.1-.3v-.7c0-.1 0-.2.2-.3 0 0 .2-.2.3-.2h.7s.2 0 .3.1l.2.2v.3h-.4c0-.1 0-.2-.2-.3h-.5s-.1 0-.2.1c0 0 0 .1-.1.2v.6s0 .2.1.2l.2.1h.5s.1-.2.2-.3h.4Z"
              className="Bastion_Hero_Section_svg__st2"
            />
          </g>
        </g>
      </g>
      <path
        d="M1766.4 310.4v5.5h-.8v-5.5h-7.9v-.6h10.6v.6zM1769.3 315v-5.3h4.2v.6h-3.4v1.6h3v.6h-3v1.8h3.4v.6h-4.2ZM1779.2 313.4c0 .3 0 .5-.2.7s-.3.4-.4.5-.4.3-.7.4c-.3 0-.6.2-.9.2s-.6 0-.9-.1c-.3 0-.5-.2-.8-.4-.2-.1-.3-.3-.4-.4 0-.2-.2-.3-.2-.5v-2.5c0-.2.1-.4.2-.5 0-.2.2-.3.4-.4.2-.2.5-.3.8-.4s.6-.1.9-.1.7 0 .9.2c.3 0 .5.2.7.4s.3.3.4.5.2.4.2.7h-.8v-.4q0-.15-.3-.3c-.1 0-.3-.2-.5-.3s-.4 0-.7 0h-.6c-.2 0-.4.2-.5.3-.1 0-.2.2-.3.4s-.1.3-.2.4v1.7000000000000002c0 .1 0 .3.2.4s.2.3.3.4c.2.1.3.2.5.3s.4 0 .6 0h.7c.3 0 .4-.2.5-.3 0 0 .2-.2.3-.4v-.4h.8ZM1784.2 315v-2.4h-3.1v2.4h-.8v-5.3h.8v2.2h3.1v-2.2h.8v5.3z"
        className="Bastion_Hero_Section_svg__st2"
      />
      <path
        d="M1765.6 320.9v-5.3h.8v4.6h3.1v.6h-3.9ZM1774.2 320.9l-.5-1.3h-2.7l-.5 1.3h-.8l2.2-5.3h.9l2.2 5.3h-.9Zm-1.9-4.6-1.1 2.7h2.2zM1780.6 319.4c0 .2 0 .4-.1.5 0 .2-.2.3-.4.4-.2.2-.4.3-.7.4s-.6.1-.9.1h-2.6v-5.3h2.5c.3 0 .6 0 .9.1s.5.2.7.4c.1 0 .2.2.3.4s0 .3 0 .5 0 .5-.2.7-.4.4-.7.4c.2 0 .3 0 .4.2s.2.2.3.3c0 0 .2.2.2.4v.4Zm-1-2.3v-.4s-.1-.2-.3-.3l-.4-.2h-2.2v1.7h1.8c.3 0 .6 0 .8-.2.2-.1.3-.4.3-.6m.2 2.3v-.4l-.3-.3c-.1-.1-.3-.1-.4-.2h-2.3v1.8h2.3c.2 0 .3 0 .4-.2s.2-.2.3-.3zM1748.5 320.9s5.2-8.1 5.7-8.8 1.1-1.7 3.5-1.7v-.6s-2.1-.1-3.3 1.3-6.5 9.8-6.5 9.8h.8Z"
        className="Bastion_Hero_Section_svg__st2"
      />
      <path
        d="M1784.3 326.5h-58.8c-6.1 0-11.1-5-11.1-11.1s5-11.1 11.1-11.1h58.8c6.1 0 11.1 5 11.1 11.1s-5 11.1-11.1 11.1m-58.8-21.7c-5.9 0-10.6 4.8-10.6 10.6s4.8 10.6 10.6 10.6h58.8c5.9 0 10.6-4.8 10.6-10.6s-4.8-10.6-10.6-10.6z"
        className="Bastion_Hero_Section_svg__st2"
      />
      <g
        style={{
          clipPath: "url(#Bastion_Hero_Section_svg__clippath)",
        }}
      >
        <path
          d="M1725.5 304.5c-6.1 0-11 4.8-11 10.9h.2c0-5.9 4.8-10.8 10.8-10.8Zm58.8 0c5.9 0 10.8 4.9 10.8 10.9h.2c0-6.1-4.9-11-11-11Zm10.8 10.9c0 5.9-4.8 10.8-10.8 10.8v.2c6.1 0 11-4.9 11-11Zm-69.6 10.9c-5.9 0-10.8-4.9-10.8-10.9h-.2c0 6.1 4.9 11 11 11Zm58.8 0h-58.8v.2h58.8Zm-58.8-21.8h58.8v-.2h-58.8Z"
          className="Bastion_Hero_Section_svg__st2"
        />
        <path
          d="M1784.5 326.6h-59.3c-6.1-.2-11-5.1-11-11.2v-.2c.1-6 5-10.8 10.9-10.9s59.3 0 59.3 0c6.1.2 11 5.1 11 11.2v.2c-.1 6-5 10.9-10.9 11Zm-59-.7h58.8c5.8 0 10.5-4.7 10.5-10.5s-4.7-10.5-10.5-10.5h-58.7c-5.8 0-10.5 4.7-10.5 10.5v.2c.1 5.7 4.8 10.3 10.5 10.3Z"
          className="Bastion_Hero_Section_svg__st2"
        />
      </g>
      <path
        d="M1728.5 311.2h11.8zc-.6 0-1.1.5-1.1 1.1v.6-.6c0-.6-.5-1.1-1.1-1.1h-1 1c.6 0 1.1-.5 1.1-1.1v-.6.6c0 .6.5 1.1 1.1 1.1M1728.5 318.9h11.8zc-.6 0-1.1.5-1.1 1.1v.6-.6c0-.6-.5-1.1-1.1-1.1h-1 1c.6 0 1.1-.5 1.1-1.1v-.6.6c0 .6.5 1.1 1.1 1.1M1724 314.9h11.8zc-.6 0-1.1.5-1.1 1.1v.6-.6c0-.6-.5-1.1-1.1-1.1h-1 1c.6 0 1.1-.5 1.1-1.1v-.6.6c0 .6.5 1.1 1.1 1.1"
        className="Bastion_Hero_Section_svg__st2"
      />
    </svg>
  );
};

export default SvgBastionHeroSection;
