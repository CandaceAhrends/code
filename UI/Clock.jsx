import React from 'react';
import './clock.scss';

const Clock = () => {
  const ref = React.useRef();
  const [deg, setDeg] = React.useState(0);

  React.useEffect(() => {
    const intr = setInterval(() => {
      setDeg((prev) => (prev + 1) % 360);
    }, 1000);

    return () => clearInterval(intr);
  }, []);

  React.useEffect(() => {
    ref.current.style.transform = `rotate(${deg}deg)`;
  }, [deg]);
  return (
    <div className="clock-wrapper">
      <div className="parent">
        <ul className="clock">
          <li ref={ref} className="large"></li>

          <p>{deg}</p>
        </ul>
      </div>
    </div>
  );
};

export default Clock;
