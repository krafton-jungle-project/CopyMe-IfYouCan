import axios from 'axios';
import { useEffect, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

const ModalBackGround = styled.div<{ isVisible: boolean }>`
  z-index: 100;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #0008;
  animation: ${fadeIn} 1s;

  ${(p) =>
    !p.isVisible &&
    css`
      animation: ${fadeOut} 0.315s;
    `}
`;

const ModalWrapper = styled.div<{ isVisible: boolean }>`
  z-index: 100;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  background-color: #18022b;
  border: 0.1rem solid #fff;
  border-radius: 12px;
  box-shadow: 0 0 0.2rem #fff, 0 0 0.2rem #fff, 0 0 2rem #bc13fe, 0 0 0.8rem #bc13fe,
    0 0 2.8rem #bc13fe, inset 0 0 1.3rem #bc13fe;

  width: 500px;
  height: 650px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  ${(p) =>
    !p.isVisible &&
    css`
      animation: ${fadeOut} 0.315s;
    `}
`;

const Form = styled.form`
  width: 90%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const Div = styled.div`
  position: absolute;
  top: 5%;
  width: 90%;
  display: flex;
  justify-content: flex-end;
`;

const Title = styled.div`
  padding: 5px 0;
  font-size: 2rem;
  text-align: center;
  font-weight: 700;
`;

const Label = styled.label`
  width: 90%;
  font-size: 1rem;
  margin-bottom: 3px;
  color: #fffe;
`;

const Input = styled.input`
  font-size: large;
  padding: 3% 2%;
  width: 90%;
  margin: 5px 10px;
  border-radius: 3px;
  border: 2px solid #fffe;
  background-color: transparent;
  color: #fff;

  &:focus {
    transition: 0.3s;
    box-shadow: 0 0 0.1rem #fff, 0 0 0.1rem #fff, 0 0 0.4rem #fff, 0 0 0.4rem #fff, 0 0 0.6rem #fff,
      inset 0 0 0.4rem #fff;
    outline: none;
  }
`;

const ErrorWrapper = styled.div`
  margin: 6px 0px 10px 0px;
  height: 25px;
  width: 90%;
`;

const ErrorText = styled.div`
  color: #f00;
  font-size: 0.9rem;
  text-shadow: 0 0 2px #f00;
`;

const ModalBtn = styled.button`
  padding: 1% 2%;
  background-color: transparent;
  border: 1px solid #fff;
  box-shadow: 0 0 0.3rem #fff, 0 0 0.3rem #fff;
  border-radius: 5px;
  color: #fff;
  font-size: large;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    background-color: #e6a7ff44;
    text-shadow: 0 0 2px #fff;
    box-shadow: 0 0 0.1rem #fff, 0 0 0.1rem #fff, 0 0 2rem #bc13fe, 0 0 0.8rem #bc13fe,
      0 0 2.8rem #bc13fe, inset 0 0 0.3rem #bc13fe;
  }
`;

const RegisterBtn = styled.button`
  width: 90%;
  border-radius: 3px;
  border: 2px solid #fffe;
  background-color: #e6a7ff54;
  color: #fff;
  font-size: 1.2rem;
  padding: 3.5%;
  cursor: pointer;
  transition: 0.3s;

  &:hover {
    background-color: #e6a7ff44;
    text-shadow: 0 0 2px #fff;
    box-shadow: 0 0 0.2rem #fff, 0 0 0.2rem #fff, 0 0 2rem #bc13fe, 0 0 0.8rem #bc13fe,
      0 0 2.8rem #bc13fe, inset 0 0 0.3rem #bc13fe;
  }
`;

function RegisterModal({
  setIsModalOpened,
}: {
  setIsModalOpened: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [id, setId] = useState<string>('');
  const [pw, setPw] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [idValid, setIdValid] = useState<boolean>(false);
  const [pwValid, setPwValid] = useState<boolean>(false);
  const [nameValid, setNameValid] = useState<boolean>(false);
  const [notAllow, setNotAllow] = useState<boolean>(true);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  const lazyClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsModalOpened(false);
    }, 300);
  };

  useEffect(() => {
    if (idValid && pwValid && nameValid) {
      setNotAllow(false);
      return;
    }
    setNotAllow(true);
  }, [idValid, pwValid, nameValid]);

  const handleId = (e: React.ChangeEvent<HTMLInputElement>) => {
    setId(e.target.value);
    const regex = /^[a-z]+[a-z0-9]{5,19}$/g;
    if (regex.test(e.target.value)) {
      setIdValid(true);
    } else {
      setIdValid(false);
    }
  };

  const handlePw = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPw(e.target.value);
    const regex = /^[a-z]+[a-z0-9]{5,19}$/g;
    if (regex.test(e.target.value)) {
      setPwValid(true);
    } else {
      setPwValid(false);
    }
  };

  const handleName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    const regex = /^.{0,6}$/;
    if (regex.test(e.target.value)) {
      setNameValid(true);
    } else {
      setNameValid(false);
    }
  };

  const onClickConfirmButton = () => {
    console.log('signup');
    axios
      .post(`https://${process.env.REACT_APP_SERVER_URL}/users`, {
        loginid: id,
        name: name,
        password: pw,
      })
      .then((res) => {
        console.log(res.data.data);
        // 토큰을 받아서 저장 (local storage 또는 쿠키?)
        alert('회원가입이 완료되었습니다.');
        window.location.reload();
        // navigate('/login', { replace: true });
        return res;
      })
      .catch((error) => {
        // 회원가입 실패시 알림
        // 중복 아이디 에러 메시지
        alert(error.response.data.message);
      });
  };

  return (
    <>
      <ModalBackGround onClick={lazyClose} isVisible={isVisible} />
      <ModalWrapper isVisible={isVisible}>
        <Div>
          <ModalBtn onClick={lazyClose}>X</ModalBtn>
        </Div>
        <Form>
          <Title>REGISTER</Title>
          <Label>아이디</Label>
          <Input placeholder="아이디" onChange={handleId} value={id} />

          <ErrorWrapper>
            {!idValid && id.length > 0 && (
              <ErrorText>영문, 숫자 포함 6자 이상 입력해주세요.</ErrorText>
            )}
          </ErrorWrapper>

          <Label>비밀번호</Label>
          <Input type="password" placeholder="비밀번호" onChange={handlePw} value={pw} />

          <ErrorWrapper>
            {!pwValid && pw.length > 0 && (
              <ErrorText>영문, 숫자 포함 6자 이상 입력해주세요.</ErrorText>
            )}
          </ErrorWrapper>

          <Label>닉네임</Label>
          <Input placeholder="닉네임" onChange={handleName} value={name} />
          <ErrorWrapper>
            {!nameValid && name.length > 0 && <ErrorText>6자 이하로 입력해주세요.</ErrorText>}
          </ErrorWrapper>
          <RegisterBtn type="button" onClick={onClickConfirmButton} disabled={notAllow}>
            가입하기
          </RegisterBtn>
        </Form>
      </ModalWrapper>
    </>
  );
}

export default RegisterModal;
