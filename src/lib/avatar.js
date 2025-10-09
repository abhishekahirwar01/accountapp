import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const Avatar = ({ children, size = 40, style }) => {
  return (
    <View style={[
      styles.avatar, 
      { width: size, height: size, borderRadius: size / 2 },
      style
    ]}>
      {typeof children === 'string' ? (
        <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
}

export default Avatar

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
  }
})