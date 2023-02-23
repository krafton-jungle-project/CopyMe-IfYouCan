import { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import good from '../../../assets/images/score/good.gif';
import great from '../../../assets/images/score/great.gif';
import perfect from '../../../assets/images/score/perfect.gif';
import fail from '../../../assets/images/score/fail.gif';
import { Fail, Stamp } from '../../../utils/sound';

const GradeImg = styled.img<{ isMine: boolean }>`
  position: absolute;

  ${(props) =>
    props.isMine &&
    css`
      top: 80%;
      left: 15%;
    `}
  ${(props) =>
    !props.isMine &&
    css`
      top: 80%;
      right: 14%;
    `}
`;

function Grade({ score, isMine }: { score: number; isMine: boolean }) {
  const [gradeImg, setGradeImg] = useState('');

  useEffect(() => {
    if (score > 70) {
      if (score > 90) {
        setGradeImg(perfect);
      } else if (score > 80) {
        setGradeImg(great);
      } else {
        setGradeImg(good);
      }
      Stamp.play();
    } else {
      setGradeImg(fail);
      Fail.play();
    }
  }, [score]);

  return <GradeImg src={gradeImg} alt="grade" isMine={isMine} />;
}

export default Grade;
