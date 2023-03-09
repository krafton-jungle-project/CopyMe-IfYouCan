import type { Keypoint, Pose } from '@tensorflow-models/pose-detection';

// Usage Usage Usage Usage Usage Usage Usage Usage

// comparePoses(채점기준포즈, 수비자);
// vectorComparePoses(채점기준포즈, 수비자);
// cosineSimilarity(채점기준포즈, 수비자);

// euclideanDistance 함수
function euclideanDistance(kp1: Keypoint, kp2: Keypoint): number {
  return Math.sqrt(Math.pow(kp1.x - kp2.x, 2) + Math.pow(kp1.y - kp2.y, 2));
}

// 사각형 산술평균 중심
function squareCenter(a: Keypoint, b: Keypoint, c: Keypoint, d: Keypoint): number[] {
  return [(a.x + b.x + c.x + d.x) / 4, (a.y + b.y + c.y + d.y) / 4];
}

// // 다각형 무게중심 코드
// function getCentroid(points: Keypoint[]) {
//   let area = 0,
//     cx = 0,
//     cy = 0;

//   for (let i = 0; i < points.length; i++) {
//     let j = (i + 1) % points.length;

//     let pt1 = points[i];
//     let pt2 = points[j];

//     let x1 = pt1[0];
//     let x2 = pt2[0];
//     let y1 = pt1[1];
//     let y2 = pt2[1];

//     area += x1 * y2;
//     area -= y1 * x2;

//     cx += (x1 + x2) * (x1 * y2 - x2 * y1);
//     cy += (y1 + y2) * (x1 * y2 - x2 * y1);
//   }

//   area /= 2;
//   area = Math.abs(area);

//   cx = cx / (6.0 * area);
//   cy = cy / (6.0 * area);

//   return {
//     x: Math.abs(cx),
//     y: Math.abs(cy),
//   };
// }

/**
 * @param {*} pose1 : 공격자 (채점 기준)
 * @param {*} pose2 : 수비자 (채점)
 * @returns 공격자 기준에 맞춘 수비자의 pose2
 */
function alignPose(pose1: Pose, pose2: Pose): Pose {
  // 5번: 왼쪽 어깨
  // 6번: 오른쪽 어깨
  // 11번: 왼쪽 골반
  // 12번: 오른쪽 골반

  // 공격자 몸통 (평가 기준)
  let leftHip1 = pose1.keypoints[11];
  let rightHip1 = pose1.keypoints[12];
  let leftShoulder1 = pose1.keypoints[5];
  let rightShoulder1 = pose1.keypoints[6];

  // 수비자 몸통 (채점 해야함)
  let leftHip2 = pose2.keypoints[11];
  let rightHip2 = pose2.keypoints[12];
  let leftShoulder2 = pose2.keypoints[5];
  let rightShoulder2 = pose2.keypoints[6];

  // 몸통의 산술 평균 중심으로 pose2를 pose1의 몸통 중심으로 옮기기 위한 substract factor 설정
  let center1 = squareCenter(leftHip1, rightHip1, leftShoulder1, rightShoulder1);
  let center2 = squareCenter(leftHip2, rightHip2, leftShoulder2, rightShoulder2);

  // 2번 포즈의 중심을 1번 포즈의 중심으로 옮기는 translation factor
  let translation = {
    x: center1[0] - center2[0],
    y: center1[1] - center2[1],
  };

  // 2번 포즈의 모든 점들을 translation factor에 따라 평행 이동 시킴
  for (const keypoint of pose2.keypoints) {
    keypoint.x += translation.x;
    keypoint.y += translation.y;
  }

  return pose2;
}
// 여기까지 공통 사용 함수
// -----------------------------------------------

// -----------------------------------------------
// 공격자의 어깨 거리를 scaling factor로 이용한 계산 방법

function resizePose(pose1: Pose, pose2: Pose): void {
  // 양쪽 어깨 좌표 받아옴, 어깨가 가장 인식이 잘 되므로 어깨로 선정하겠슴다
  const leftShoulder1 = pose1.keypoints[5];
  const rightShoulder1 = pose1.keypoints[6];

  const leftShoulder2 = pose2.keypoints[5];
  const rightShoulder2 = pose2.keypoints[6];

  // 어깨 간의 유클리디안 거리 계산
  // 직각 삼각형에서 빗변 구하는 공식이라고 보면 됨
  const shoulderDist1: number = euclideanDistance(leftShoulder1, rightShoulder1);
  const shoulderDist2: number = euclideanDistance(leftShoulder2, rightShoulder2);

  // 어깨 거리에 따라 이미지의 스케일 계수를 결정
  // 기준이 되는(우리에게는 공격자) 사람의 키포인트를 스케일링 함수에 넣어 스케일 계수 설정 후 아래 진행
  const scaleFactor: number = shoulderDist2 / shoulderDist1;

  // 키포인트의 좌표 값을 스케일 계수에 따라 보정
  for (const keypoint of pose2.keypoints) {
    keypoint.x /= scaleFactor;
    keypoint.y /= scaleFactor;
  }
}

function comparePoses(pose1: Pose, pose2: Pose): number {
  // Deep copy 후 cmpPose 진행, shallow copy 진행 시, 캔버스에 skeleton을 그릴 때
  // resizing된 점들을 토대로 그리기 때문에 제대로 그려지지 않음

  // 일단 기준 포즈와 채점
  // pose1 = stdPose;
  let myPose = JSON.parse(JSON.stringify(pose1));
  let peerPose = JSON.parse(JSON.stringify(pose2));

  resizePose(myPose, peerPose);

  // 어깨와 골반 총 4개의 점을 이용하여 몸통의 중심을 기준으로 pose를 align함
  let alignedPose1 = alignPose(myPose, myPose);
  let alignedPose2 = alignPose(myPose, peerPose);

  // align 후에 같은 신체 부위의 점들의 차의 평균 거리를 구함
  // 포즈 1의 한 점과 포즈 2의 한 점의 유클리디안 거리를 구해서 totalDistance 합함
  let totalDistance = 0;
  for (let i = 5; i < alignedPose1.keypoints.length; i++) {
    let joint1 = alignedPose1.keypoints[i];
    let joint2 = alignedPose2.keypoints[i];
    let distance = euclideanDistance(joint1, joint2);
    totalDistance += distance;
  }

  // (점들의 차의 합) / (점의 개수)
  // totalDistance / 17
  let averageDistance = totalDistance / (alignedPose1.keypoints.length - 5);
  let score = Math.ceil(100 - 100 * averageDistance);
  // return score > 0 ? score : 0;
  return averageDistance;
}

// -----------------------------------------------
// vector vector vector vector vector vector vector
// 34차원 벡터 이용한 scaling factor 구하는 함수
function vectorScalingFactor(pose1: Pose, pose2: Pose): number {
  const initCoordinate = {
    x: 0,
    y: 0,
  };
  let sum1: number = 0;
  let sum2: number = 0;
  let keypoint: Keypoint;

  // 얼굴 키포인트 제외하고 scalingFactor 계산
  // for (let i = 0; i < pose.keypoints.length; i++) {
  for (let i = 5; i < pose1.keypoints.length; i++) {
    keypoint = pose1.keypoints[i];
    // (0, 0)과 모든 신체 키포인트에 대한 거리의 제곱들을 모두 더함
    sum1 += euclideanDistance(keypoint, initCoordinate) ** 2;
  }
  for (let i = 5; i < pose2.keypoints.length; i++) {
    keypoint = pose2.keypoints[i];
    // (0, 0)과 모든 신체 키포인트에 대한 거리의 제곱들을 모두 더함
    sum2 += euclideanDistance(keypoint, initCoordinate) ** 2;
  }
  // 다 더한 값에 제곱근을 씌우고 계산한 키포인트 개수만큼 나눔
  // const scalingFactor: number = sum ** 0.5 / (pose.keypoints.length - 5);
  const res1: number = sum1 ** 0.5;
  const res2: number = sum2 ** 0.5;

  const scalingFactor: number = res1 / res2;

  return scalingFactor;
}

// vector scaling 함수
function vectorResizePose(pose: Pose, scalingFactor: number): void {
  // 키포인트의 좌표 값을 스케일 계수에 따라 보정
  for (const keypoint of pose.keypoints) {
    keypoint.x *= scalingFactor;
    keypoint.y *= scalingFactor;
  }
}

function vectorComparePoses(pose1: Pose, pose2: Pose): number {
  // Deep copy 후 cmpPose 진행, shallow copy 진행 시, 캔버스에 skeleton을 그릴 때
  // resizing된 점들을 토대로 그리기 때문에 제대로 그려지지 않음

  const scalingFactor1 = vectorScalingFactor(pose1, pose2);

  let myPose = JSON.parse(JSON.stringify(pose1));
  let peerPose = JSON.parse(JSON.stringify(pose2));

  // 모든 좌표의 제곱의 합을 1로 만듦
  vectorResizePose(peerPose, scalingFactor1);

  // 어깨와 골반 총 4개의 점을 이용하여 몸통의 중심을 기준으로 pose를 align함
  let alignedPose1 = alignPose(myPose, myPose);
  let alignedPose2 = alignPose(myPose, peerPose);

  // align 후에 같은 신체 부위의 점들의 차의 평균 거리를 구함
  // 포즈 1의 한 점과 포즈 2의 한 점의 유클리디안 거리를 구해서 totalDistance 합함
  let totalDistance = 0;
  for (let i = 5; i < alignedPose1.keypoints.length; i++) {
    let joint1 = alignedPose1.keypoints[i];
    let joint2 = alignedPose2.keypoints[i];
    let distance = euclideanDistance(joint1, joint2);
    totalDistance += distance;
  }

  // (점들의 차의 합) / (점의 개수)
  // totalDistance / 17
  let averageDistance = totalDistance / (alignedPose1.keypoints.length - 5);
  let score = Math.ceil(100 - 100 * averageDistance);
  // return score;
  return averageDistance;
}

function compareBeforeAfter(pose: Pose): number[] {
  let before: number = comparePoses(stdPose, pose);
  let after: number = vectorComparePoses(stdPose, pose);

  return [before, after];
}

export { comparePoses, vectorComparePoses, compareBeforeAfter };

const stdPose = {
  keypoints: [
    {
      y: 102.32397811647627,
      x: 317.77891888749076,
      score: 0.524370551109314,
      name: 'nose',
    },
    {
      y: 95.89698086155383,
      x: 325.83646084391313,
      score: 0.6754545569419861,
      name: 'left_eye',
    },
    {
      y: 94.65624582323431,
      x: 309.52331182963195,
      score: 0.6927956342697144,
      name: 'right_eye',
    },
    {
      y: 106.06414893156844,
      x: 336.40641951667556,
      score: 0.8166402578353882,
      name: 'left_ear',
    },
    {
      y: 104.52040281586898,
      x: 300.1385435540584,
      score: 0.7499926686286926,
      name: 'right_ear',
    },
    {
      y: 151.07636536679277,
      x: 351.5366097559036,
      score: 0.840023934841156,
      name: 'left_shoulder',
    },
    {
      y: 151.75774838727224,
      x: 277.6696410271652,
      score: 0.7506059408187866,
      name: 'right_shoulder',
    },
    {
      y: 213.4454798506027,
      x: 364.5635298215178,
      score: 0.7202083468437195,
      name: 'left_elbow',
    },
    {
      y: 216.22065492033897,
      x: 266.9451931373128,
      score: 0.6515448093414307,
      name: 'right_elbow',
    },
    {
      y: 261.6989588913633,
      x: 363.2169751213518,
      score: 0.6500011682510376,
      name: 'left_wrist',
    },
    {
      y: 264.70290145172237,
      x: 263.75021362451787,
      score: 0.7714205980300903,
      name: 'right_wrist',
    },
    {
      y: 262.8305680700712,
      x: 336.64035742736826,
      score: 0.8510838747024536,
      name: 'left_hip',
    },
    {
      y: 261.76476086348094,
      x: 292.0175319391057,
      score: 0.8412824273109436,
      name: 'right_hip',
    },
    {
      y: 358.7558154105006,
      x: 331.84621098534853,
      score: 0.7504003047943115,
      name: 'left_knee',
    },
    {
      y: 359.07504247847544,
      x: 296.0166214563911,
      score: 0.8078945875167847,
      name: 'right_knee',
    },
    {
      y: 437.70608984901384,
      x: 334.3771766789177,
      score: 0.6798939108848572,
      name: 'left_ankle',
    },
    {
      y: 440.2507283399807,
      x: 290.5572821116479,
      score: 0.652317464351654,
      name: 'right_ankle',
    },
  ],
  score: 0.7186706556993372,
};
