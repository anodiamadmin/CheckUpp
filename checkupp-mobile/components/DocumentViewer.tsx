// components/DocumentViewer.tsx
import { WebView } from "react-native-webview";
import { Modal, View, TouchableOpacity, Text } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

const DocumentViewer = ({
  visible,
  url,
  onClose,
}: {
  visible: boolean;
  url: string;
  onClose: () => void;
}) => {
  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-100">
          <Text className="text-lg font-psemibold text-gray-900">
            Document Viewer
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="p-2 bg-gray-200 rounded-full"
            activeOpacity={0.7}
          >
            <AntDesign name="close" size={20} color="#4B5563" />
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          <WebView
            source={{
              uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
                url
              )}`,
            }}
            className="flex-1"
            startInLoadingState={true}
            renderLoading={() => (
              <View className="flex-1 justify-center items-center">
                <Text className="text-gray-500 mt-2 font-pregular">
                  Loading document...
                </Text>
              </View>
            )}
          />
        </View>

        <View className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <Text className="text-sm text-gray-500 font-pregular text-center">
            Tap close to exit
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default DocumentViewer;
