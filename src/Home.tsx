import * as React from "react"
import { useNavigation } from "@react-navigation/native"
import { SafeAreaView, View, Text, StyleSheet } from "react-native"
import { TouchableOpacity } from "react-native-gesture-handler"
import SelfieSvg from "./SelfieSvg"

const Home = () => {
  const navigation = useNavigation()
  const startDetection = () => navigation.navigate("Detection")

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Liveness Detection</Text>
      <View style={styles.bottomContainer}>
        <SelfieSvg size={300} style={styles.selfieSvg} />
        <TouchableOpacity style={styles.btn} onPress={startDetection}>
          <Text style={styles.btnText}>START</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8"
  },
  title: {
    fontSize: 64,
    fontWeight: "bold",
    alignSelf: "center",
    marginTop: 50,
    color: "#1e293b",
    zIndex: 1
  },
  selfieSvg: {
    position: "absolute",
    bottom: 58
  },
  bottomContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 25
  },
  btn: {
    width: 300,
    height: 60,
    borderRadius: 5,
    justifyContent: "center",
    backgroundColor: "#334155"
  },
  btnText: {
    fontSize: 24,
    textAlign: "center",
    color: "white"
  }
})

export default Home
