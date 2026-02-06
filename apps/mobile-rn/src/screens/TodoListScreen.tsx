import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

export default function TodoListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Todo List</Text>
      <Text style={styles.subtitle}>할일 목록이 여기에 표시됩니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
