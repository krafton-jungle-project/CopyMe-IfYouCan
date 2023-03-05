import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import DefaultProfileImg from '../../../assets/images/in-game/my-default-profile.png';
import { stream } from '../../../utils/tfjs-movenet';

const Container = styled.div`
  position: absolute;
  top: 50%;
  left: 0;
  transform: translate(0, -50%);
  width: 100%;
  aspect-ratio: 1;
  border-radius: 20px;
  box-shadow: 0 0 0.2rem #fff, 0 0 0.2rem #fff, 0 0 2rem #ff3131;
`;

const Img = styled.img`
  position: absolute;
  object-fit: cover;
  width: 100%;
  height: 100%;
  border-radius: 20px;
`;

const Video = styled.video`
  position: absolute;
  object-fit: cover;
  transform: scaleX(-1);
  width: 100%;
  height: 100%;
  border-radius: 20px;
  background-color: #0008;
`;

function MyVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, []);

  return (
    <Container>
      <Img src={DefaultProfileImg} />
      <Video ref={videoRef} autoPlay></Video>
    </Container>
  );
}

export default MyVideo;
