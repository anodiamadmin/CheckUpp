import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { Animated, Easing } from "react-native";

const useScreenEntrance = (duration = 240) => {
  const progress = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      progress.setValue(0);

      const animation = Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });

      animation.start();

      return () => {
        animation.stop();
      };
    }, [duration, progress]),
  );

  return progress;
};

export default useScreenEntrance;
