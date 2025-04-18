'use client';

import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

export default function TimerClient() {
  const [roomId, setRoomId] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(null); // 現在参加中のルームID
  const [timers, setTimers] = useState({});

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected:', socket.id);
    });

    // 部屋に参加したときに、部屋に関連するタイマー情報を受け取る
    socket.on('all_timers', (initialTimers) => {
      const loadedTimers = {};
      for (const timer of initialTimers) {
        loadedTimers[timer.timerId] = {
          timerId: timer.timerId,
          count: timer.count,
          isRunning: timer.isRunning || false,
          note: timer.note || ''
        };
      }
      setTimers(loadedTimers);
    });
    

    socket.on('timer_created', ({ timerId, count, note }) => {
      setTimers((prev) => ({
        ...prev,
        [timerId]: { timerId, count, isRunning: false, note: note || '' }
      }));
    });

    socket.on('timer_update', ({ timerId, count }) => {
      setTimers((prev) => ({
        ...prev,
        [timerId]: { ...prev[timerId], count: parseFloat(count) }
      }));
    });

    socket.on('timer_status', ({ timerId, isRunning }) => {
      setTimers((prev) => ({
        ...prev,
        [timerId]: { ...prev[timerId], isRunning }
      }));
    });

    socket.on('timer_deleted', (timerId) => {
      setTimers((prev) => {
        const updated = { ...prev };
        delete updated[timerId];
        return updated;
      });
    });

    socket.on('note_updated', ({ timerId, note }) => {
      setTimers((prev) => ({
        ...prev,
        [timerId]: { ...prev[timerId], note }
      }));
    });

    return () => {
      socket.off('all_timers');
      socket.off('timer_created');
      socket.off('timer_update');
      socket.off('timer_status');
      socket.off('timer_deleted');
      socket.off('note_updated');
    };
  }, []);

  const handleJoinRoom = () => {
    if (!roomId) return;
    socket.emit('join_room', roomId);
    setJoinedRoom(roomId);
  };

  const handleLeaveRoom = () => {
    socket.emit('leave_room', joinedRoom);
    setJoinedRoom(null);
    setTimers({}); // タイマー情報リセット
  };

  const handleCreateTimer = () => {
    if (!joinedRoom) return;
    socket.emit('create_timer', { roomId: joinedRoom });
  };

  const handleStart = (timerId) => {
    socket.emit('resume_timer', { roomId: joinedRoom, timerId });
  };

  const handleStop = (timerId) => {
    socket.emit('stop_timer', { roomId: joinedRoom, timerId });
  };

  const handleReset = (timerId) => {
    socket.emit('reset_timer', { roomId: joinedRoom, timerId });
  };

  const handleDelete = (timerId) => {
    socket.emit('delete_timer', { roomId: joinedRoom, timerId });
  };

  const handleNoteChange = (timerId, newNote) => {
    setTimers((prev) => ({
      ...prev,
      [timerId]: { ...prev[timerId], note: newNote }
    }));
    socket.emit('update_note', { roomId: joinedRoom, timerId, note: newNote });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">リアルタイムタイマー</h1>
      <p>(部屋ごとに分けてタイマーを管理できるなり)</p>
      <p>(友達とルームIDを共有して、タイマーを共有できやす!)</p>


      {joinedRoom ? (
        <div className="mb-4">
          <p className="mb-2">参加中のルームID: <strong>{joinedRoom}</strong></p>
          <button onClick={handleLeaveRoom} className="bg-red-500 text-white px-4 py-1 rounded">
            退出
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="ルームIDを入力"
            className="border px-2 py-1 rounded mr-2"
          />
          <button onClick={handleJoinRoom} className="bg-blue-500 text-white px-4 py-1 rounded">
            参加
          </button>
        </div>
      )}

      {joinedRoom && (
        <>
          <button
            onClick={handleCreateTimer}
            className="bg-green-500 text-white px-4 py-2 rounded mb-4"
          >
            タイマーを作成
          </button>

          <div className="space-y-4">
            {Object.values(timers).map((timer) => (
              <div key={timer.timerId} className="border rounded p-4 shadow">
                <p className="text-lg font-semibold">
                  ID: {timer.timerId}
                </p>
                <input
                  type="text"
                  value={timer.note}
                  onChange={(e) => handleNoteChange(timer.timerId, e.target.value)}
                  placeholder="このタイマーの用途（メモ）"
                  className="w-full border px-2 py-1 rounded mb-2"
                />
                <p className="text-2xl mb-2">{timer.count.toFixed(1)} 秒</p>
                <div className="space-x-2">
                  {timer.isRunning ? (
                    <button onClick={() => handleStop(timer.timerId)} className="bg-yellow-500 text-white px-3 py-1 rounded">
                      停止
                    </button>
                  ) : (
                    <button onClick={() => handleStart(timer.timerId)} className="bg-blue-500 text-white px-3 py-1 rounded">
                      開始
                    </button>
                  )}
                  <button onClick={() => handleReset(timer.timerId)} className="bg-gray-500 text-white px-3 py-1 rounded">
                    リセット
                  </button>
                  <button onClick={() => handleDelete(timer.timerId)} className="bg-red-500 text-white px-3 py-1 rounded">
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

