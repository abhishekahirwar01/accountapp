import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
} from 'react-native';
// यह वह लाइब्रेरी है जो नेटिव क्रॉपर लॉन्च करती है
import ImagePicker from 'react-native-image-crop-picker';

/**
 * ImageCropper (Native Wrapper)
 * यह कंपोनेंट सीधे नेटिव क्रॉपर को लॉन्च करता है और उसके परिणाम का इंतजार करता है।
 */
export default function ImageCropper({
  image,
  visible,
  onCropComplete,
  onCancel,
}) {
  const [loading, setLoading] = useState(false);

  // 1. नेटिव क्रॉपर को लॉन्च करने का फंक्शन
  const openNativeCropper = useCallback(async () => {
    if (!image) {
      onCancel();
      return;
    }

    try {
      setLoading(true); // लोडिंग शुरू करें (यह लोडिंग स्क्रीन दिखेगी)

      // **यह कॉल नेटिव UI को लॉन्च करता है**
      const croppedImage = await ImagePicker.openCropper({
        path: image,
        width: 300,
        height: 300,
        cropping: true,
        cropperCircleOverlay: false, // वेब जैसा Rectangular Cropper
        compressImageQuality: 0.95,
        mediaType: 'photo',

        // आप केवल Toolbar के Text और Color को सेट कर सकते हैं,
        // लेकिन ज़ूम स्लाइडर या बटन नहीं जोड़ सकते।
        cropperToolbarTitle: 'Crop Logo',
        cropperCancelText: 'Cancel',
        cropperChooseText: 'Done',
      });

      // 2. जब नेटिव क्रॉपर बंद हो जाता है, तो परिणाम यहाँ आता है
      onCropComplete(croppedImage);
    } catch (error) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        console.error('Crop Error:', error);
        Alert.alert('Error', 'An error occurred during cropping.');
      }
      // अगर यूज़र नेटिव क्रॉपर में 'Cancel' दबाता है, तो यह यहाँ कैच होता है।
    } finally {
      setLoading(false);
      onCancel(); // मोडल को बंद करें
    }
  }, [image, onCropComplete, onCancel]);

  useEffect(() => {
    // 3. visible होने पर Cropper को लॉन्च करें
    if (visible && !loading) {
      // setTimeout एक अच्छी प्रथा है ताकि मोडल पूरी तरह से रेंडर हो जाए
      const timer = setTimeout(openNativeCropper, 100);
      return () => clearTimeout(timer);
    }
  }, [visible, loading, openNativeCropper]);

  if (!visible) return null;

  // 4. यह UI केवल एक लोडिंग/ट्रांजिशन स्क्रीन है
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.text}>Opening crop tool…</Text>
        <Text style={styles.subText}>(Using Native {Platform.OS} Cropper)</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 16,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  subText: {
    marginTop: 4,
    color: '#aaa',
    fontSize: 14,
  },
});
