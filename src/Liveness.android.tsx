import * as FaceDetector from "expo-face-detector"
import React, { useEffect, useReducer, useRef, useState } from "react"
import { StyleSheet, Text, View, Dimensions, PixelRatio, Alert } from "react-native"
import { Camera, FaceDetectionResult } from "expo-camera"
import { AnimatedCircularProgress } from "react-native-circular-progress"
import { useNavigation } from "@react-navigation/native"
import Svg, { Path, SvgProps } from "react-native-svg"

const { width: windowWidth } = Dimensions.get("window")

// TODO: Thresholds are different for MLKit Android
// TODO: Camera preview size takes actual specified size and not the entire screen.

interface FaceDetection {
  rollAngle: number
  yawAngle: number
  smilingProbability: number
  leftEyeOpenProbability: number
  rightEyeOpenProbability: number
  bounds: {
    origin: {
      x: number
      y: number
    }
    size: {
      width: number
      height: number
    }
  }
}

const detections = {
  BLINK: { promptText: "Blink both eyes", minProbability: 0.4 },
  TURN_HEAD_LEFT: { promptText: "Turn head left", maxAngle: 310 },
  TURN_HEAD_RIGHT: { promptText: "Turn head right", minAngle: 50 },
  NOD: { promptText: "Nod", minDiff: 1 },
  SMILE: { promptText: "Smile", minProbability: 0.7 }
}

type DetectionActions = keyof typeof detections

const promptsText = {
  noFaceDetected: "No face detected",
  performActions: "Perform the following actions:"
}

const detectionsList: DetectionActions[] = [
  "BLINK",
  "TURN_HEAD_LEFT",
  "TURN_HEAD_RIGHT",
  "NOD",
  "SMILE"
]

const initialState = {
  faceDetected: false,
  promptText: promptsText.noFaceDetected,
  detectionsList,
  currentDetectionIndex: 0,
  progressFill: 0,
  processComplete: false
}

export default function Liveness() {
  const navigation = useNavigation()
  const [hasPermission, setHasPermission] = useState(false)
  const [state, dispatch] = useReducer(detectionReducer, initialState)
  const rollAngles = useRef<number[]>([])
  const rect = useRef<View>(null)

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync()
      setHasPermission(status === "granted")
    }

    requestPermissions()
  }, [])

  const drawFaceRect = (face: FaceDetection) => {
    rect.current?.setNativeProps({
      width: face.bounds.size.width,
      height: face.bounds.size.height,
      top: face.bounds.origin.y,
      left: face.bounds.origin.x
    })
  }

  const onFacesDetected = (result: FaceDetectionResult) => {
    if (result.faces.length !== 1) {
      dispatch({ type: "FACE_DETECTED", value: "no" })
      return
    }

    //@ts-ignore
    const face: FaceDetection = result.faces[0]

    // offset used to get the center of the face, instead of top left corner
    const midFaceOffsetY = face.bounds.size.height / 2
    const midFaceOffsetX = face.bounds.size.width / 2

    drawFaceRect(face)
    // make sure face is centered
    const faceMidYPoint = face.bounds.origin.y + midFaceOffsetY
    console.log(`
    face.bounds.origin.y: ${face.bounds.origin.y}

    `)
    if (
      // if middle of face is outside the preview towards the top
      faceMidYPoint <= PREVIEW_MARGIN_TOP ||
      // if middle of face is outside the preview towards the bottom
      faceMidYPoint >= PREVIEW_SIZE + PREVIEW_MARGIN_TOP
    ) {
      dispatch({ type: "FACE_DETECTED", value: "no" })
      return
    }

    const faceMidXPoint = face.bounds.origin.x + midFaceOffsetX
    if (
      // if face is outside the preview towards the left
      faceMidXPoint <= windowWidth / 2 - PREVIEW_SIZE / 2 ||
      // if face is outside the preview towards the right
      faceMidXPoint >= windowWidth / 2 + PREVIEW_SIZE / 2
    ) {
      dispatch({ type: "FACE_DETECTED", value: "no" })
      return
    }

    // drawFaceRect(face)

    if (!state.faceDetected) {
      dispatch({ type: "FACE_DETECTED", value: "yes" })
    }

    const detectionAction = state.detectionsList[state.currentDetectionIndex]

    switch (detectionAction) {
      case "BLINK":
        // lower probabiltiy is when eyes are closed
        const leftEyeClosed =
          face.leftEyeOpenProbability <= detections.BLINK.minProbability
        const rightEyeClosed =
          face.rightEyeOpenProbability <= detections.BLINK.minProbability
        if (leftEyeClosed && rightEyeClosed) {
          dispatch({ type: "NEXT_DETECTION", value: null })
        }
        return
      case "NOD":
        // Collect roll angle data
        rollAngles.current.push(face.rollAngle)

        // Don't keep more than 10 roll angles
        if (rollAngles.current.length > 10) {
          rollAngles.current.shift()
        }

        // If not enough roll angle data, then don't process
        if (rollAngles.current.length < 10) return

        // Calculate avg from collected data, except current angle data
        const rollAnglesExceptCurrent = [...rollAngles.current].splice(
          0,
          rollAngles.current.length - 1
        )
        const rollAnglesSum = rollAnglesExceptCurrent.reduce((prev, curr) => {
          return prev + Math.abs(curr)
        }, 0)
        const avgAngle = rollAnglesSum / rollAnglesExceptCurrent.length

        // If the difference between the current angle and the average is above threshold, pass.
        const diff = Math.abs(avgAngle - Math.abs(face.rollAngle))

        // console.log(`
        // avgAngle: ${avgAngle}
        // rollAngle: ${face.rollAngle}
        // diff: ${diff}
        // `)
        if (diff >= detections.NOD.minDiff) {
          dispatch({ type: "NEXT_DETECTION", value: null })
        }
        return
      case "TURN_HEAD_LEFT":
        // console.log("TURN_HEAD_LEFT " + face.yawAngle)
        if (face.yawAngle <= detections.TURN_HEAD_LEFT.maxAngle) {
          dispatch({ type: "NEXT_DETECTION", value: null })
        }
        return
      case "TURN_HEAD_RIGHT":
        // console.log("TURN_HEAD_RIGHT " + face.yawAngle)
        if (face.yawAngle >= detections.TURN_HEAD_RIGHT.minAngle) {
          dispatch({ type: "NEXT_DETECTION", value: null })
        }
        return
      case "SMILE":
        // higher probabiltiy is when smiling
        // console.log(face.smilingProbability)
        if (face.smilingProbability >= detections.SMILE.minProbability) {
          dispatch({ type: "NEXT_DETECTION", value: null })
        }
        return
    }
  }

  useEffect(() => {
    if (state.processComplete) {
      Alert.alert('Liveness', 'Liveness check passed')
      setTimeout(() => {
        // delay so we can see progress fill aniamtion (500ms)
        navigation.goBack()
      }, 750)
    }
  }, [state.processComplete])

  if (hasPermission === false) {
    return <Text>No access to camera</Text>
  }

  return (
    <View style={styles.container}>
      <View
        style={{
          position: "absolute",
          top: 0,
          width: "100%",
          height: PREVIEW_MARGIN_TOP,
          backgroundColor: "white",
          zIndex: 10
        }}
      />
      <View
        style={{
          position: "absolute",
          top: PREVIEW_MARGIN_TOP,
          left: 0,
          width: (windowWidth - PREVIEW_SIZE) / 2,
          height: PREVIEW_SIZE,
          backgroundColor: "white",
          zIndex: 10
        }}
      />
      <View
        style={{
          position: "absolute",
          top: PREVIEW_MARGIN_TOP,
          right: 0,
          width: (windowWidth - PREVIEW_SIZE) / 2 + 1,
          height: PREVIEW_SIZE,
          backgroundColor: "white",
          zIndex: 10
        }}
      />

      <Camera
        style={styles.cameraPreview}
        type={Camera.Constants.Type.front}
        onFacesDetected={onFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
          runClassifications: FaceDetector.FaceDetectorClassifications.all,
          minDetectionInterval: 0,
          tracking: false
        }}
      >
        <CameraPreviewMask width={"100%"} style={styles.circularProgress} />
        <AnimatedCircularProgress
          style={styles.circularProgress}
          size={PREVIEW_SIZE}
          width={5}
          backgroundWidth={7}
          fill={state.progressFill}
          tintColor="#3485FF"
          backgroundColor="#e8e8e8"
        />
      </Camera>
      <View
        ref={rect}
        style={{
          position: "absolute",
          borderWidth: 2,
          borderColor: "pink",
          zIndex: 10
        }}
      />
      <View style={styles.promptContainer}>
        <Text style={styles.faceStatus}>
          {!state.faceDetected && promptsText.noFaceDetected}
        </Text>
        <Text style={styles.actionPrompt}>
          {state.faceDetected && promptsText.performActions}
        </Text>
        <Text style={styles.action}>
          {state.faceDetected &&
            detections[state.detectionsList[state.currentDetectionIndex]]
              .promptText}
        </Text>
      </View>
    </View>
  )
}

interface Action<T extends keyof Actions> {
  type: T
  value: Actions[T]
}
interface Actions {
  FACE_DETECTED: "yes" | "no"
  NEXT_DETECTION: null
}

const detectionReducer = (
  state: typeof initialState,
  action: Action<keyof Actions>
): typeof initialState => {
  const numDetections = state.detectionsList.length
  // +1 for face detection
  const newProgressFill =
    (100 / (numDetections + 1)) * (state.currentDetectionIndex + 1)

  switch (action.type) {
    case "FACE_DETECTED":
      if (action.value === "yes") {
        return { ...state, faceDetected: true, progressFill: newProgressFill }
      } else {
        // Reset
        return initialState
      }
    case "NEXT_DETECTION":
      const nextIndex = state.currentDetectionIndex + 1
      if (nextIndex === numDetections) {
        // success
        return { ...state, processComplete: true, progressFill: 100 }
      }
      // next
      return {
        ...state,
        currentDetectionIndex: nextIndex,
        progressFill: newProgressFill
      }
    default:
      throw new Error("Unexpeceted action type.")
  }
}

const CameraPreviewMask = (props: SvgProps) => (
  <Svg width={300} height={300} viewBox="0 0 300 300" fill="none" {...props}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M150 0H0v300h300V0H150zm0 0c82.843 0 150 67.157 150 150s-67.157 150-150 150S0 232.843 0 150 67.157 0 150 0z"
      fill="#fff"
    />
  </Svg>
)

const PREVIEW_MARGIN_TOP = 50
const PREVIEW_SIZE = 300

const styles = StyleSheet.create({
  actionPrompt: {
    fontSize: 20,
    textAlign: "center"
  },
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  promptContainer: {
    position: "absolute",
    alignSelf: "center",
    top: PREVIEW_MARGIN_TOP + PREVIEW_SIZE,
    height: "100%",
    width: "100%",
    backgroundColor: "white"
  },
  faceStatus: {
    fontSize: 24,
    textAlign: "center",
    marginTop: 10
  },
  cameraPreview: {
    flex: 1
  },
  circularProgress: {
    position: "absolute",
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    top: PREVIEW_MARGIN_TOP,
    alignSelf: "center"
  },
  action: {
    fontSize: 24,
    textAlign: "center",
    marginTop: 10,
    fontWeight: "bold"
  }
})
