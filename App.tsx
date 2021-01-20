import * as React from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import Liveness from "./src/Liveness"
import Home from "./src/Home"

const Stack = createStackNavigator()

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={Home}
          options={{ title: "Demo" }}
        />
        <Stack.Screen name="Detection" component={Liveness} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default App
