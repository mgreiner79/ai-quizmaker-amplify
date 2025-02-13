import React from 'react';
import './TetrominoLoader.scss';

const TetrominoLoader: React.FC = () => {
  return (
    <div className="tetrominos">
      <div className="tetromino box1"></div>
      <div className="tetromino box2"></div>
      <div className="tetromino box3"></div>
      <div className="tetromino box4"></div>
    </div>
  );
};

export default TetrominoLoader;
